'use client'

export default function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      icon: '🗺️',
      title: 'Выберите город',
      description: 'Найдите интересующий вас город из нашего каталога или на интерактивной карте',
      details: ['2,500+ зданий', '50+ городов', '15 стран']
    },
    {
      number: '02',
      icon: '📍',
      title: 'Создайте маршрут',
      description: 'Соберите уникальный архитектурный маршрут из выбранных зданий',
      details: ['Вручную или AI', 'Любой транспорт', 'Любая длина']
    },
    {
      number: '03',
      icon: '🎧',
      title: 'Делитесь впечатлениями',
      description: 'Оставляйте отзывы, фото и аудио-гиды о посещенных объектах',
      details: ['Текст + фото', 'Аудио-гиды', 'Экспертные обзоры']
    }
  ]

  return (
    <section className="py-12 bg-background relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 border border-border rounded-full"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 border border-border rounded-full"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header - centered */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-8 h-px bg-border"></div>
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              How It Works
            </span>
            <div className="w-8 h-px bg-border"></div>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Three Simple <span className="font-light italic">Steps</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From exploration to creating your own architectural journey
          </p>
        </div>

        {/* Steps - horizontal layout with connecting lines */}
        <div className="relative">
          {/* Connecting line - desktop only */}
          <div className="hidden lg:block absolute top-16 left-0 right-0 h-px bg-border"></div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className="relative group"
                style={{
                  animationDelay: `${index * 150}ms`
                }}
              >
                {/* Step number indicator */}
                <div className="relative inline-flex items-center justify-center mb-6">
                  {/* Large number background */}
                  <div className="absolute text-8xl font-bold text-foreground/5 select-none">
                    {step.number}
                  </div>

                  {/* Icon container */}
                  <div className="relative w-32 h-32 bg-card border-2 border-border flex items-center justify-center transition-all duration-300 group-hover:border-foreground/30 group-hover:scale-105"
                    style={{ borderRadius: '2px' }}
                  >
                    <span className="text-5xl">{step.icon}</span>

                    {/* Step number badge */}
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-foreground text-background flex items-center justify-center text-sm font-bold"
                      style={{ borderRadius: '2px' }}
                    >
                      {index + 1}
                    </div>
                  </div>

                  {/* Connecting dot - desktop */}
                  <div className="hidden lg:block absolute -bottom-6 left-1/2 -translate-x-1/2 w-3 h-3 bg-foreground"
                    style={{ borderRadius: '2px' }}
                  />
                </div>

                {/* Content */}
                <div className="text-center lg:text-left">
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {step.title}
                  </h3>

                  <p className="text-muted-foreground leading-relaxed mb-4">
                    {step.description}
                  </p>

                  {/* Details list */}
                  <div className="flex flex-wrap justify-center lg:justify-start gap-2">
                    {step.details.map((detail, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-muted text-foreground text-xs font-medium border border-border"
                        style={{ borderRadius: '2px' }}
                      >
                        {detail}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Arrow connector - mobile */}
                {index < steps.length - 1 && (
                  <div className="flex justify-center my-8 md:hidden">
                    <svg className="w-6 h-6 text-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row gap-4 items-center">
            <a
              href="/map"
              className="inline-flex items-center gap-2 px-8 py-4 bg-foreground text-background font-medium hover:bg-foreground/90 transition-all group"
              style={{ borderRadius: '2px' }}
            >
              Start Now
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>

            <span className="text-sm text-muted-foreground">
              Free, no registration required
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
