import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'
import { ArrowLeft, MapPin, Users, Heart, Globe } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About Us - ArchiRoutes',
  description: 'Learn about ArchiRoutes - a platform for discovering and sharing architectural treasures around the world.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header buildings={[]} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/5 via-background to-background py-16 md:py-24">
          <div className="container mx-auto px-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              About <span className="text-primary">ArchiRoutes</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl">
              Discover city architecture through the lens of an enthusiast community.
              Explore buildings, share routes, and create together with us.
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-8">Our Mission</h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  ArchiRoutes is a platform dedicated to making architectural exploration accessible and enjoyable
                  for everyone. We believe that every building tells a story, and every city is a living museum
                  waiting to be discovered.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Our mission is to connect architecture enthusiasts, tourists, and curious minds through
                  interactive maps, curated routes, and community-driven content. Whether you're a professional
                  architect, a student, or simply someone who appreciates beautiful buildings, ArchiRoutes is
                  your companion in urban exploration.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">What We Offer</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
              {[
                {
                  icon: MapPin,
                  title: 'Interactive Maps',
                  description: 'Explore cities with detailed architectural maps featuring thousands of buildings worldwide.'
                },
                {
                  icon: Users,
                  title: 'Community Routes',
                  description: 'Discover walking routes created by architecture enthusiasts and local experts.'
                },
                {
                  icon: Heart,
                  title: 'Reviews & Ratings',
                  description: 'Read authentic reviews and share your own experiences with audio guides.'
                },
                {
                  icon: Globe,
                  title: 'Global Coverage',
                  description: 'From Berlin to Istanbul, explore architectural treasures across the world.'
                }
              ].map((feature, index) => (
                <div key={index} className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-8">Our Values</h2>
              <div className="space-y-6">
                <div className="border-l-4 border-primary pl-6">
                  <h3 className="font-semibold text-xl mb-2">Community First</h3>
                  <p className="text-muted-foreground">
                    We believe in the power of community-driven content. Every route, review, and
                    recommendation comes from real people who are passionate about architecture.
                  </p>
                </div>
                <div className="border-l-4 border-primary pl-6">
                  <h3 className="font-semibold text-xl mb-2">Quality & Accuracy</h3>
                  <p className="text-muted-foreground">
                    We maintain high standards for the information on our platform, with moderation
                    and verification processes to ensure accuracy.
                  </p>
                </div>
                <div className="border-l-4 border-primary pl-6">
                  <h3 className="font-semibold text-xl mb-2">Accessibility</h3>
                  <p className="text-muted-foreground">
                    Architecture should be accessible to everyone. We strive to make our platform
                    easy to use, informative, and welcoming for all levels of expertise.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary/5">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Join Our Community</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Start exploring architectural treasures, create your own routes, and share your
                discoveries with fellow enthusiasts.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/map"
                  className="inline-flex items-center justify-center px-8 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Explore Map
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center px-8 py-3 bg-card border-2 border-border font-medium rounded-lg hover:bg-muted transition-colors"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <EnhancedFooter />
    </div>
  )
}
