'use client'

// src/app/admin/prompts/page.tsx
// Admin page for editing AI moderation & translation prompts

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Bot, Save, RefreshCw, Loader2, ChevronDown, ChevronUp, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import type { AIPrompt } from '@/types/building'

const PROMPT_DESCRIPTIONS: Record<string, { title: string; hint: string }> = {
  review_moderation: {
    title: 'Review Moderation Prompt',
    hint: 'Used for AI safety analysis of user reviews. Placeholders: {language}, {title}, {content}',
  },
  review_translation: {
    title: 'Review Translation Prompt',
    hint: 'Used for translating reviews to 7 languages in one call. Placeholders: {source_language}, {target_languages}, {title}, {content}',
  },
}

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
]

export default function AdminPromptsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { profile } = useAuth()
  const [prompts, setPrompts] = useState<AIPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editedPrompts, setEditedPrompts] = useState<Record<string, Partial<AIPrompt>>>({})

  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator'

  useEffect(() => {
    if (!isAdmin) return
    loadPrompts()
  }, [isAdmin])

  const loadPrompts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .order('name')
      if (error) throw error
      setPrompts(data || [])
      // Initialize edits with current values
      const edits: Record<string, Partial<AIPrompt>> = {}
      for (const p of data || []) {
        edits[p.id] = {
          prompt_template: p.prompt_template,
          model: p.model,
          fallback_model: p.fallback_model,
          is_active: p.is_active,
        }
      }
      setEditedPrompts(edits)
    } catch (err) {
      toast.error('Failed to load prompts')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (prompt: AIPrompt) => {
    const edits = editedPrompts[prompt.id]
    if (!edits) return

    setSaving(prompt.id)
    try {
      const { error } = await supabase
        .from('ai_prompts')
        .update({
          prompt_template: edits.prompt_template,
          model: edits.model,
          fallback_model: edits.fallback_model,
          is_active: edits.is_active,
          updated_by: profile?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prompt.id)

      if (error) throw error
      toast.success(`Prompt "${prompt.name}" saved`)
      loadPrompts()
    } catch (err) {
      toast.error('Failed to save prompt')
    } finally {
      setSaving(null)
    }
  }

  const updateEdit = (promptId: string, field: keyof AIPrompt, value: any) => {
    setEditedPrompts((prev) => ({
      ...prev,
      [promptId]: { ...prev[promptId], [field]: value },
    }))
  }

  const toggleExpand = (promptId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(promptId) ? next.delete(promptId) : next.add(promptId)
      return next
    })
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 font-medium">Access denied — admin only</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="w-6 h-6 text-indigo-600" />
            AI Prompts Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Edit prompts used for content moderation and translation. Changes apply to all new requests immediately.
          </p>
        </div>
        <button
          onClick={loadPrompts}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-gray-500">Loading prompts...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {prompts.map((prompt) => {
            const meta = PROMPT_DESCRIPTIONS[prompt.name]
            const edits = editedPrompts[prompt.id] || {}
            const isExpanded = expanded.has(prompt.id)
            const hasChanges =
              edits.prompt_template !== prompt.prompt_template ||
              edits.model !== prompt.model ||
              edits.fallback_model !== prompt.fallback_model

            return (
              <div
                key={prompt.id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Bot className="w-5 h-5 text-indigo-500" />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {meta?.title || prompt.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Model: <span className="font-medium text-gray-700">{prompt.model}</span>
                        {' · '}Fallback: <span className="font-medium text-gray-700">{prompt.fallback_model}</span>
                      </p>
                    </div>
                    {!prompt.is_active && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">Disabled</span>
                    )}
                    {hasChanges && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">Unsaved changes</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {hasChanges && (
                      <button
                        onClick={() => handleSave(prompt)}
                        disabled={saving === prompt.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {saving === prompt.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save
                      </button>
                    )}
                    <button
                      onClick={() => toggleExpand(prompt.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {isExpanded ? 'Collapse' : 'Edit'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50">
                    {/* Hint */}
                    {meta?.hint && (
                      <div className="flex items-start gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{meta.hint}</span>
                      </div>
                    )}

                    {/* Model selectors */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Primary Model
                        </label>
                        <select
                          value={edits.model || prompt.model}
                          onChange={(e) => updateEdit(prompt.id, 'model', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                        >
                          {GEMINI_MODELS.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Fallback Model
                        </label>
                        <select
                          value={edits.fallback_model || prompt.fallback_model}
                          onChange={(e) => updateEdit(prompt.id, 'fallback_model', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                        >
                          {GEMINI_MODELS.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`active-${prompt.id}`}
                        checked={edits.is_active ?? prompt.is_active}
                        onChange={(e) => updateEdit(prompt.id, 'is_active', e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <label htmlFor={`active-${prompt.id}`} className="text-sm text-gray-700">
                        Prompt is active (uncheck to disable AI for this function)
                      </label>
                    </div>

                    {/* Prompt template editor */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Prompt Template
                      </label>
                      <textarea
                        value={edits.prompt_template ?? prompt.prompt_template}
                        onChange={(e) => updateEdit(prompt.id, 'prompt_template', e.target.value)}
                        rows={16}
                        className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white resize-y"
                        spellCheck={false}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Last updated: {new Date(prompt.updated_at).toLocaleString('en-US')}
                      </p>
                    </div>

                    {/* Save button at bottom too */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleSave(prompt)}
                        disabled={saving === prompt.id || !hasChanges}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {saving === prompt.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
