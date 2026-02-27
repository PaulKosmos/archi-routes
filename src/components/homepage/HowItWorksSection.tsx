'use client'

import { Map, PenLine, Route } from 'lucide-react'

const STEP_ICONS = [
  <Map className="w-8 h-8 md:w-10 md:h-10 text-foreground" strokeWidth={1.5} />,
  <PenLine className="w-8 h-8 md:w-10 md:h-10 text-foreground" strokeWidth={1.5} />,
  <Route className="w-8 h-8 md:w-10 md:h-10 text-foreground" strokeWidth={1.5} />,
]

export default function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      title: 'Discover Objects',
      description: 'Explore thousands of architectural objects on the interactive map. Filter by style, city, architect, or era.',
      details: ['2,500+ buildings', '50+ cities', 'Smart filters']
    },
    {
      number: '02',
      title: 'Add & Review',
      description: 'Add new objects and write reviews with photos. AI automatically translates your review and generates an audio guide.',
      details: ['AI translation', 'Audio guide']
    },
    {
      number: '03',
      title: 'Build Routes',
      description: 'Create architectural walking routes manually or let AI generate one for you. Share them with the community.',
      details: ['Manual or AI', 'Any transport', 'Share publicly']
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
        {/* Section Header */}
        <div className="text-center mb-10 md:mb-12">
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

        {/* ── MOBILE: compact vertical list ── */}
        <div className="flex flex-col md:hidden">
          {steps.map((step, index) => (
            <div key={step.number}>
              {/* Step card — horizontal layout */}
              <div className="flex items-start gap-4 p-4 bg-card border border-border rounded-lg">
                {/* Icon + badge */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-14 h-14 bg-muted border border-border flex items-center justify-center"
                    style={{ borderRadius: '2px' }}
                  >
                    {STEP_ICONS[index]}
                  </div>
                  <div
                    className="absolute -top-2 -right-2 w-5 h-5 bg-foreground text-background flex items-center justify-center text-xs font-bold"
                    style={{ borderRadius: '2px' }}
                  >
                    {index + 1}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">{step.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {step.details.map((detail, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-muted text-foreground text-xs font-medium border border-border"
                        style={{ borderRadius: '2px' }}
                      >
                        {detail}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Arrow connector */}
              {index < steps.length - 1 && (
                <div className="flex flex-col items-center py-1">
                  <div className="w-px h-3 bg-border"></div>
                  <svg className="w-5 h-5 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v10.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── DESKTOP: 3-column grid ── */}
        <div className="relative hidden md:block">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-14 left-0 right-0 h-px bg-border"></div>

          <div className="grid grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <div key={step.number} className="relative group">
                {/* Icon */}
                <div className="relative flex items-center justify-center mb-6">
                  <div className="absolute text-8xl font-bold text-foreground/5 select-none">
                    {step.number}
                  </div>
                  <div
                    className="relative w-32 h-32 bg-card border-2 border-border flex items-center justify-center transition-all duration-300 group-hover:border-foreground/30 group-hover:scale-105"
                    style={{ borderRadius: '2px' }}
                  >
                    {STEP_ICONS[index]}
                    <div
                      className="absolute -top-3 -right-3 w-8 h-8 bg-foreground text-background flex items-center justify-center text-sm font-bold"
                      style={{ borderRadius: '2px' }}
                    >
                      {index + 1}
                    </div>
                  </div>
                  <div
                    className="hidden lg:block absolute -bottom-6 left-1/2 -translate-x-1/2 w-3 h-3 bg-foreground"
                    style={{ borderRadius: '2px' }}
                  />
                </div>

                {/* Content */}
                <div className="text-center lg:text-left">
                  <h3 className="text-xl font-semibold text-foreground mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">{step.description}</p>
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
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 md:mt-16 text-center">
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
            <span className="text-sm text-muted-foreground">Free</span>
          </div>
        </div>
      </div>
    </section>
  )
}
