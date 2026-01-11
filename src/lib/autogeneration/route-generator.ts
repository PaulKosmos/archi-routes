// src/lib/autogeneration/route-generator.ts - Ядро системы автогенерации маршрутов

import { createClient } from '../supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  RouteTemplate,
  GenerationParams,
  GeneratedPoint,
  GenerationResult,
  AIProvider,
  RouteGenerationLog
} from '../../types/autogeneration'
import type { Building } from '../../types/building'

// ======================================
// ОСНОВНОЙ КЛАСС ГЕНЕРАТОРА МАРШРУТОВ
// ======================================

export class RouteGenerator {
  private supabase: SupabaseClient
  private aiProvider?: AIProvider
  private generationLog: Partial<RouteGenerationLog> = {}

  constructor(supabase: SupabaseClient, aiProvider?: AIProvider) {
    this.supabase = supabase
    this.aiProvider = aiProvider
  }

  // ======================================
  // ГЛАВНЫЙ МЕТОД ГЕНЕРАЦИИ
  // ======================================

  async generateRoute(params: GenerationParams): Promise<GenerationResult> {
    const startTime = Date.now()

    try {
      // Создаем лог генерации
      await this.createGenerationLog(params)
      await this.updateLogStatus('processing')

      console.log('🚀 Запуск генерации маршрута:', params)

      // 1. Получаем шаблон если указан
      const template = params.template_id
        ? await this.getTemplate(params.template_id)
        : null

      // 2. Находим подходящие здания
      const buildings = await this.findSuitableBuildings(params, template)
      console.log(`🏢 Найдено ${buildings.length} подходящих зданий`)

      if (buildings.length < Math.min(params.max_points || 3, 3)) {
        throw new Error(`Not enough buildings to create route. Found: ${buildings.length}, minimum needed: ${Math.min(params.max_points || 3, 3)}`)
      }

      // 3. Оптимизируем выбор точек
      const selectedBuildings = await this.optimizeBuildingSelection(
        buildings,
        params,
        template
      )
      console.log(`✅ Выбрано ${selectedBuildings.length} зданий для маршрута`)

      // 4. Создаем точки маршрута
      const points = await this.createRoutePoints(selectedBuildings, params, template)

      // 5. Генерируем AI контент если нужно
      const routeData = await this.enhanceWithAI(points, params, template)

      // 6. Финальная обработка
      const result: GenerationResult = {
        route_data: routeData,
        generation_metadata: {
          buildings_considered: buildings.length,
          points_filtered: selectedBuildings.length,
          ai_calls_made: this.aiProvider ? 1 : 0,
          optimization_iterations: 1,
          quality_score: this.calculateQualityScore(selectedBuildings, params)
        },
        ai_usage: this.aiProvider ? {
          provider: this.aiProvider.name,
          model: this.aiProvider.default_model,
          tokens_used: 150, // Примерное значение
          cost_usd: 0.01,
          response_time_ms: 1000
        } : {
          provider: 'none',
          model: 'none',
          tokens_used: 0,
          cost_usd: 0,
          response_time_ms: 0
        }
      }

      // 7. Обновляем лог
      const processingTime = Date.now() - startTime
      await this.updateLogStatus('completed', result, processingTime)

      console.log('✅ Генерация завершена успешно')
      return result

    } catch (error) {
      console.error('❌ Ошибка генерации:', error)
      const processingTime = Date.now() - startTime
      await this.updateLogStatus('failed', undefined, processingTime, error.message)
      throw error
    }
  }

  // ======================================
  // ПОИСК ПОДХОДЯЩИХ ЗДАНИЙ
  // ======================================

  private async findSuitableBuildings(
    params: GenerationParams,
    template?: RouteTemplate
  ): Promise<Building[]> {
    console.log('🔍 Поиск зданий по критериям...')

    // Поддержка многоязычных названий городов
    const cityVariants = this.getCityVariants(params.city)

    let query = this.supabase
      .from('buildings')
      .select('*')
      .in('city', cityVariants)

    // Применяем фильтры из шаблона
    if (template?.generation_rules.selection_criteria) {
      const criteria = template.generation_rules.selection_criteria

      if (criteria.architectural_style?.length) {
        // Поддержка многоязычных архитектурных стилей
        const allStyleVariants = criteria.architectural_style.flatMap(style =>
          this.normalizeArchitecturalStyle(style)
        )
        query = query.in('architectural_style', allStyleVariants)
      }

      if (criteria.building_types?.length) {
        query = query.in('building_type', criteria.building_types)
      }

      if (criteria.min_rating) {
        query = query.gte('rating', criteria.min_rating)
      }

      if (criteria.max_rating) {
        query = query.lte('rating', criteria.max_rating)
      }

      if (criteria.has_description) {
        query = query.not('description', 'is', null)
      }

      if (criteria.year_range) {
        if (criteria.year_range.min) {
          query = query.gte('year_built', criteria.year_range.min)
        }
        if (criteria.year_range.max) {
          query = query.lte('year_built', criteria.year_range.max)
        }
      }
    }

    // Применяем фильтры из шаблона конфигурации
    if (template?.template_config) {
      const config = template.template_config

      if (config.min_year) {
        query = query.gte('year_built', config.min_year)
      }

      if (config.max_year) {
        query = query.lte('year_built', config.max_year)
      }

      if (config.building_types?.length) {
        query = query.in('building_type', config.building_types)
      }

      if (config.architectural_styles?.length) {
        query = query.in('architectural_style', config.architectural_styles)
      }
    }

    // Ограничиваем количество для производительности
    query = query.limit(100)

    const { data, error } = await query

    if (error) {
      throw new Error(`Building search error: ${error.message}`)
    }

    return data || []
  }

  // ======================================
  // ОПТИМИЗАЦИЯ ВЫБОРА ЗДАНИЙ
  // ======================================

  private async optimizeBuildingSelection(
    buildings: Building[],
    params: GenerationParams,
    template?: RouteTemplate
  ): Promise<Building[]> {
    console.log('⚡ Оптимизация выбора зданий...')

    if (buildings.length === 0) {
      return []
    }

    const maxPoints = Math.min(params.max_points || 10, buildings.length)
    const rules = template?.generation_rules.optimization

    // 1. Сортируем по рейтингу и уникальности
    let sortedBuildings = [...buildings].sort((a, b) => {
      const ratingDiff = (b.rating || 0) - (a.rating || 0)
      if (Math.abs(ratingDiff) > 0.5) return ratingDiff

      // При равном рейтинге предпочитаем здания с большим количеством данных
      const aScore = this.getBuildingDataScore(a)
      const bScore = this.getBuildingDataScore(b)
      return bScore - aScore
    })

    // 2. Применяем географическую оптимизацию
    if (rules?.logical_flow && buildings.length >= 3) {
      sortedBuildings = this.optimizeGeographicalFlow(sortedBuildings, rules)
    }

    // 3. Обеспечиваем разнообразие
    const selectedBuildings = this.ensureDiversity(sortedBuildings, maxPoints, template)

    console.log(`📍 Финальный отбор: ${selectedBuildings.length} зданий`)
    return selectedBuildings.slice(0, maxPoints)
  }

  // ======================================
  // ГЕОГРАФИЧЕСКАЯ ОПТИМИЗАЦИЯ
  // ======================================

  private optimizeGeographicalFlow(
    buildings: Building[],
    rules: any
  ): Building[] {
    if (buildings.length < 3) return buildings

    // Находим центр масс всех зданий
    const centerLat = buildings.reduce((sum, b) => sum + (b.latitude || 0), 0) / buildings.length
    const centerLng = buildings.reduce((sum, b) => sum + (b.longitude || 0), 0) / buildings.length

    // Сортируем от центра по спирали (упрощенный алгоритм)
    return buildings.sort((a, b) => {
      const distA = this.calculateDistance(
        centerLat, centerLng,
        a.latitude || 0, a.longitude || 0
      )
      const distB = this.calculateDistance(
        centerLat, centerLng,
        b.latitude || 0, b.longitude || 0
      )
      return distA - distB
    })
  }

  // ======================================
  // ОБЕСПЕЧЕНИЕ РАЗНООБРАЗИЯ
  // ======================================

  private ensureDiversity(
    buildings: Building[],
    maxPoints: number,
    template?: RouteTemplate
  ): Building[] {
    const selected: Building[] = []
    const used_styles = new Set<string>()
    const used_types = new Set<string>()

    for (const building of buildings) {
      if (selected.length >= maxPoints) break

      // Проверяем разнообразие архитектурных стилей
      const style = building.architectural_style
      const type = building.building_type

      const styleExists = style && used_styles.has(style)
      const typeExists = type && used_types.has(type)

      // Добавляем здание если оно добавляет разнообразие или если мест мало
      if (!styleExists || !typeExists || selected.length < 3) {
        selected.push(building)
        if (style) used_styles.add(style)
        if (type) used_types.add(type)
      }
    }

    // Если не хватает разнообразных зданий, добавляем лучшие оставшиеся
    while (selected.length < maxPoints && selected.length < buildings.length) {
      const remaining = buildings.filter(b => !selected.includes(b))
      if (remaining.length > 0) {
        selected.push(remaining[0])
      } else {
        break
      }
    }

    return selected
  }

  // ======================================
  // СОЗДАНИЕ ТОЧЕК МАРШРУТА
  // ======================================

  private async createRoutePoints(
    buildings: Building[],
    params: GenerationParams,
    template?: RouteTemplate
  ): Promise<GeneratedPoint[]> {
    console.log('📍 Создание точек маршрута...')

    const points: GeneratedPoint[] = buildings.map((building, index) => ({
      building_id: building.id,
      title: building.name,
      description: building.description || `Архитектурный объект ${building.name}`,
      latitude: building.latitude || 0,
      longitude: building.longitude || 0,
      order_index: index,
      estimated_time_minutes: this.estimateVisitTime(building, template),
      point_type: 'building' as const,
      instructions: this.generateVisitInstructions(building, template)
    }))

    return points
  }

  // ======================================
  // УЛУЧШЕНИЕ С ПОМОЩЬЮ AI
  // ======================================

  private async enhanceWithAI(
    points: GeneratedPoint[],
    params: GenerationParams,
    template?: RouteTemplate
  ) {
    console.log('🤖 Улучшение контента с помощью AI...')

    // Генерируем название маршрута
    const title = await this.generateRouteTitle(params, template, points)

    // Генерируем описание маршрута
    const description = await this.generateRouteDescription(params, template, points)

    // Генерируем теги
    const tags = this.generateRouteTags(params, template, points)

    // Улучшаем описания точек если нужно
    const enhancedPoints = await this.enhancePointDescriptions(points, template)

    return {
      title,
      description,
      points: enhancedPoints,
      total_distance: this.calculateTotalDistance(points),
      estimated_duration: this.calculateTotalDuration(points),
      transport_mode: params.transport_mode || 'walking',
      difficulty: params.difficulty || 'easy',
      tags
    }
  }

  // ======================================
  // AI ГЕНЕРАЦИЯ КОНТЕНТА
  // ======================================

  private async generateRouteTitle(
    params: GenerationParams,
    template?: RouteTemplate,
    points?: GeneratedPoint[]
  ): Promise<string> {
    if (!this.aiProvider || this.aiProvider.provider_type === 'local') {
      // Мок-генерация для тестирования
      const styleHint = template?.template_config.style || 'архитектурный'
      return `${this.capitalizeFirst(styleHint)} маршрут по ${params.city}`
    }

    // В реальной версии здесь будет вызов AI API
    const prompt = template?.ai_prompts?.title_prompt ||
      `Создай привлекательное название для архитектурного маршрута в городе ${params.city}`

    return this.mockAICall(prompt, 'title')
  }

  private async generateRouteDescription(
    params: GenerationParams,
    template?: RouteTemplate,
    points?: GeneratedPoint[]
  ): Promise<string> {
    if (!this.aiProvider || this.aiProvider.provider_type === 'local') {
      // Мок-генерация
      const pointsCount = points?.length || 0
      const styleHint = template?.template_config.style || 'различных архитектурных стилей'

      return `Увлекательный маршрут по ${pointsCount} архитектурным объектам в городе ${params.city}. ` +
        `Вы познакомитесь с зданиями ${styleHint} и узнаете их историю. ` +
        `Маршрут подходит для всех возрастов и займет около ${this.calculateTotalDuration(points || [])} минут.`
    }

    const prompt = template?.ai_prompts?.description_prompt ||
      `Напиши увлекательное описание архитектурного маршрута по ${points?.length || 0} зданиям в городе ${params.city}`

    return this.mockAICall(prompt, 'description')
  }

  private async enhancePointDescriptions(
    points: GeneratedPoint[],
    template?: RouteTemplate
  ): Promise<GeneratedPoint[]> {
    if (!this.aiProvider || this.aiProvider.provider_type === 'local') {
      return points // Возвращаем как есть для мока
    }

    // В реальной версии здесь будет улучшение описаний каждой точки
    return points
  }

  // ======================================
  // МОКИРОВАНИЕ AI ВЫЗОВОВ
  // ======================================

  private async mockAICall(prompt: string, type: string): Promise<string> {
    // Симуляция задержки AI
    await new Promise(resolve => setTimeout(resolve, 500))

    const mockResponses = {
      title: [
        'Архитектурные жемчужины города',
        'По следам великих архитекторов',
        'Тайны каменных историй',
        'Архитектурное путешествие',
        'Здания, что помнят эпохи'
      ],
      description: [
        'Откройте для себя уникальные архитектурные шедевры, каждый из которых рассказывает свою историю. Этот маршрут проведет вас через различные эпохи и стили, позволяя почувствовать дух времени.',
        'Погрузитесь в мир архитектуры и истории, исследуя здания, которые формировали облик города на протяжении веков. Узнайте секреты мастеров и их творений.',
        'Архитектурная прогулка, которая раскроет перед вами красоту и многообразие городской застройки. Каждое здание - это произведение искусства со своей уникальной историей.'
      ]
    }

    const responses = mockResponses[type] || ['Сгенерированный контент']
    return responses[Math.floor(Math.random() * responses.length)]
  }

  // ======================================
  // УТИЛИТЫ И РАСЧЕТЫ
  // ======================================

  private getBuildingDataScore(building: Building): number {
    let score = 0
    if (building.description) score += 2
    if (building.architect) score += 2
    if (building.year_built) score += 1
    if (building.architectural_style) score += 1
    if (building.image_url) score += 2
    if (building.rating && building.rating > 0) score += 1
    return score
  }

  private estimateVisitTime(building: Building, template?: RouteTemplate): number {
    // Базовое время посещения
    let baseTime = 15

    // Корректировка на основе типа здания
    if (building.building_type === 'museum') baseTime = 45
    else if (building.building_type === 'church') baseTime = 20
    else if (building.building_type === 'residential') baseTime = 10

    // Корректировка на основе шаблона
    if (template?.template_config.photography_focus) baseTime += 10

    return baseTime
  }

  private generateVisitInstructions(building: Building, template?: RouteTemplate): string {
    const instructions = []

    if (building.building_type === 'museum') {
      instructions.push('Проверьте часы работы музея')
    } else if (building.building_type === 'church') {
      instructions.push('Соблюдайте тишину при посещении')
    }

    if (template?.template_config.photography_focus) {
      instructions.push('Обратите внимание на архитектурные детали для фотографирования')
    }

    instructions.push('Рассмотрите фасад и архитектурные особенности здания')

    return instructions.join('. ') + '.'
  }

  private generateRouteTags(
    params: GenerationParams,
    template?: RouteTemplate,
    points?: GeneratedPoint[]
  ): string[] {
    const tags = [params.city]

    if (template?.category) {
      tags.push(template.category)
    }

    if (template?.template_config.style) {
      tags.push(template.template_config.style.toString())
    }

    if (params.transport_mode) {
      tags.push(params.transport_mode)
    }

    if (params.difficulty) {
      tags.push(params.difficulty)
    }

    return [...new Set(tags)] // Убираем дубликаты
  }

  private calculateTotalDistance(points: GeneratedPoint[]): number {
    if (points.length < 2) return 0

    let totalDistance = 0
    for (let i = 0; i < points.length - 1; i++) {
      const distance = this.calculateDistance(
        points[i].latitude, points[i].longitude,
        points[i + 1].latitude, points[i + 1].longitude
      )
      totalDistance += distance
    }

    return Math.round(totalDistance / 1000 * 100) / 100 // Конвертируем в км с округлением
  }

  private calculateTotalDuration(points: GeneratedPoint[]): number {
    const visitTime = points.reduce((sum, point) => sum + point.estimated_time_minutes, 0)
    const walkTime = this.calculateTotalDistance(points) * 12 // 12 минут на км
    return Math.round(visitTime + walkTime)
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000 // радиус Земли в метрах
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lng2 - lng1) * Math.PI / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  private calculateQualityScore(buildings: Building[], params: GenerationParams): number {
    if (buildings.length === 0) return 0

    // Базовый скор на основе качества зданий
    const avgRating = buildings.reduce((sum, b) => sum + (b.rating || 0), 0) / buildings.length
    const dataCompleteness = buildings.reduce((sum, b) => sum + this.getBuildingDataScore(b), 0) / buildings.length / 8 // нормализуем к 0-1

    // Географическая логичность (упрощенно)
    const geographicScore = this.calculateGeographicLogic(buildings)

    // Разнообразие
    const diversityScore = this.calculateDiversityScore(buildings)

    return Math.round((avgRating * 0.3 + dataCompleteness * 0.3 + geographicScore * 0.2 + diversityScore * 0.2) * 100) / 100
  }

  private calculateGeographicLogic(buildings: Building[]): number {
    if (buildings.length < 2) return 1

    // Простая метрика: средняя дистанция между соседними точками
    let totalDistance = 0
    for (let i = 0; i < buildings.length - 1; i++) {
      const distance = this.calculateDistance(
        buildings[i].latitude || 0, buildings[i].longitude || 0,
        buildings[i + 1].latitude || 0, buildings[i + 1].longitude || 0
      )
      totalDistance += distance
    }

    const avgDistance = totalDistance / (buildings.length - 1)

    // Оптимальная дистанция между точками 300-800м
    if (avgDistance >= 300 && avgDistance <= 800) return 1
    if (avgDistance < 100) return 0.3 // Слишком близко
    if (avgDistance > 2000) return 0.3 // Слишком далеко

    return 0.7 // Приемлемо
  }

  private calculateDiversityScore(buildings: Building[]): number {
    const styles = new Set(buildings.map(b => b.architectural_style).filter(Boolean))
    const types = new Set(buildings.map(b => b.building_type).filter(Boolean))

    const styleRatio = styles.size / buildings.length
    const typeRatio = types.size / buildings.length

    return Math.min((styleRatio + typeRatio) / 2, 1)
  }

  // ======================================
  // УТИЛИТЫ
  // ======================================

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  private getCityVariants(city: string): string[] {
    // Карта соответствий городов на разных языках
    const cityMap: { [key: string]: string[] } = {
      'Berlin': ['Berlin', 'Берлин'],
      'Берлин': ['Berlin', 'Берлин'],
      'Munich': ['Munich', 'Мюнхен'],
      'Мюнхен': ['Munich', 'Мюнхен'],
      'Hamburg': ['Hamburg', 'Гамбург'],
      'Гамбург': ['Hamburg', 'Гамбург']
    }

    return cityMap[city] || [city]
  }

  private normalizeArchitecturalStyle(style: string): string[] {
    // Карта соответствий архитектурных стилей
    const styleMap: { [key: string]: string[] } = {
      'modern': ['modern', 'модернизм', 'Модернизм'],
      'модернизм': ['modern', 'модернизм', 'Модернизм'],
      'Модернизм': ['modern', 'модернизм', 'Модернизм'],
      'art_nouveau': ['art_nouveau', 'модерн', 'Модерн'],
      'модерн': ['art_nouveau', 'модерн', 'Модерн'],
      'Модерн': ['art_nouveau', 'модерн', 'Модерн'],
      'классицизм': ['классицизм', 'Классицизм', 'classicism'],
      'Классицизм': ['классицизм', 'Классицизм', 'classicism']
    }

    return styleMap[style] || [style]
  }

  private async getTemplate(templateId: string): Promise<RouteTemplate | null> {
    const { data, error } = await this.supabase
      .from('route_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (error) {
      console.error('Ошибка получения шаблона:', error)
      return null
    }

    return data
  }

  // ======================================
  // ЛОГИРОВАНИЕ
  // ======================================

  private async createGenerationLog(params: GenerationParams): Promise<void> {
    const { data, error } = await this.supabase
      .from('route_generation_logs')
      .insert({
        template_id: params.template_id,
        triggered_by: null, // Заполнится при авторизации
        generation_type: 'manual',
        status: 'pending',
        generation_params: params,
        city: params.city,
        ai_provider: this.aiProvider?.name,
        ai_model: this.aiProvider?.default_model
      })
      .select()
      .single()

    if (error) {
      console.error('Ошибка создания лога:', error)
    } else {
      this.generationLog = data
    }
  }

  private async updateLogStatus(
    status: string,
    result?: GenerationResult,
    processingTime?: number,
    errorMessage?: string
  ): Promise<void> {
    if (!this.generationLog.id) return

    const updates: any = {
      status,
      processing_time_ms: processingTime,
      completed_at: new Date().toISOString()
    }

    if (result) {
      updates.result_data = result
      updates.points_generated = result.route_data.points.length
      updates.ai_tokens_used = result.ai_usage.tokens_used
      updates.ai_cost_usd = result.ai_usage.cost_usd
    }

    if (errorMessage) {
      updates.error_message = errorMessage
    }

    const { error } = await this.supabase
      .from('route_generation_logs')
      .update(updates)
      .eq('id', this.generationLog.id)

    if (error) {
      console.error('Ошибка обновления лога:', error)
    }
  }
}

// ======================================
// ФАБРИКА ГЕНЕРАТОРОВ
// ======================================

export class RouteGeneratorFactory {
  static async createGenerator(
    supabase: SupabaseClient,
    aiProviderName?: string
  ): Promise<RouteGenerator> {
    let aiProvider: AIProvider | undefined

    if (aiProviderName) {
      const { data } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('name', aiProviderName)
        .eq('is_active', true)
        .single()

      aiProvider = data || undefined
    }

    return new RouteGenerator(supabase, aiProvider)
  }

  static async getAvailableProviders(supabase: SupabaseClient): Promise<AIProvider[]> {
    const { data, error } = await supabase
      .from('ai_providers')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (error) {
      console.error('Ошибка получения AI провайдеров:', error)
      return []
    }

    return data || []
  }
}

export default RouteGenerator