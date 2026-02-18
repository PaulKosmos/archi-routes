'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Facebook, Twitter, Instagram, Linkedin, ArrowRight } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function EnhancedFooter() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email')
      return
    }

    try {
      setIsSubmitting(true)

      // Simulate form submission (placeholder)
      await new Promise(resolve => setTimeout(resolve, 500))

      toast.success('Thanks for subscribing! 🎉')
      setEmail('')
    } catch (error) {
      toast.error('Subscription error. Please try again later.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-[hsl(222,47%,11%)] text-[hsl(210,40%,96%)] mt-8">
      <div className="container mx-auto px-4 md:px-6 py-4 md:py-7">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">

          {/* Column 1: About Project */}
          <div className="space-y-1 md:space-y-2">
            <div className="flex items-center gap-3 mb-1 md:mb-2">
              <img
                src="/ar-logo.svg"
                alt="ArchiRoutes Logo"
                className="h-8 w-auto"
              />
            </div>
            <p className="text-sm leading-relaxed text-[hsl(215,20%,65%)]">
              Discover city architecture through the lens of an enthusiast community. Explore buildings, share routes, and create together with us.
            </p>
            <p className="text-xs text-[hsl(215,20%,55%)]">
              Platform for journeying through the world's architectural treasures
            </p>
          </div>

          {/* Column 2: Navigation */}
          <div>
            <h3 className="font-semibold mb-1.5 md:mb-3 text-sm uppercase tracking-wider">Navigation</h3>
            <ul className="space-y-1 md:space-y-1.5">
              {[
                { label: "Home", href: "/" },
                { label: "Map", href: "/map" },
                { label: "News", href: "/news" },
                { label: "Blog", href: "/blog" },
                { label: "Podcasts", href: "/podcasts" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[hsl(215,20%,65%)] hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Information */}
          <div>
            <h3 className="font-semibold mb-1.5 md:mb-3 text-sm uppercase tracking-wider">Information</h3>
            <ul className="space-y-1 md:space-y-1.5">
              {[
                { label: "About Us", href: "/about" },
                { label: "Contact", href: "/contact" },
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Use", href: "/terms" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[hsl(215,20%,65%)] hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Social & Newsletter */}
          <div>
            <h3 className="font-semibold mb-1.5 md:mb-3 text-sm uppercase tracking-wider">Subscribe</h3>
            <p className="text-sm text-[hsl(215,20%,65%)] mb-2 md:mb-3">
              Get updates on architecture and new routes
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="flex-1 bg-[hsl(222,47%,15%)] border border-[hsl(222,47%,20%)] text-white placeholder:text-[hsl(215,20%,50%)] h-10 px-3 rounded-[var(--radius)] outline-none focus:border-primary transition-colors"
                aria-label="Email for newsletter"
              />
              <button
                onClick={handleSubscribe}
                disabled={isSubmitting}
                className="h-10 w-10 bg-primary hover:bg-primary/90 rounded-[var(--radius)] flex items-center justify-center transition-opacity"
                aria-label="Subscribe"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-[hsl(215,20%,55%)] mt-2 md:mt-3">Follow us</p>
            <div className="flex gap-2 mt-1">
              {[Twitter, Facebook, Instagram, Linkedin].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  className="w-9 h-9 rounded-full border border-[hsl(222,47%,25%)] flex items-center justify-center hover:border-white transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[hsl(222,47%,18%)]">
        <div className="container mx-auto px-4 md:px-6 py-2.5 md:py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-1.5 md:gap-4">
            <p className="text-sm text-[hsl(215,20%,55%)]">
              © {currentYear} ArchiRoutes. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              {["Sitemap", "Status", "Documentation"].map((link) => (
                <Link
                  key={link}
                  href="#"
                  className="text-sm text-[hsl(215,20%,55%)] hover:text-white transition-colors"
                >
                  {link}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Made with Love */}
      <div className="border-t border-[hsl(222,47%,18%)]">
        <div className="container mx-auto px-4 md:px-6 py-2 text-center">
          <p className="text-sm text-[hsl(215,20%,55%)]">
            Made with love for architecture ❤️
          </p>
        </div>
      </div>
    </footer>
  )
}
