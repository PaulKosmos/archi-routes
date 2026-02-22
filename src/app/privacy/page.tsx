import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy - ArchiRoutes',
  description: 'ArchiRoutes Privacy Policy - Learn how we collect, use, and protect your personal information.',
}

export default function PrivacyPage() {
  const lastUpdated = 'January 15, 2026'

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
              Privacy <span className="text-primary">Policy</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto prose prose-lg">
              {/* Introduction */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Introduction</h2>
                <p className="text-muted-foreground leading-relaxed">
                  At ArchiRoutes, we take your privacy seriously. This Privacy Policy explains how we collect,
                  use, disclose, and safeguard your information when you visit our website and use our services.
                  Please read this privacy policy carefully. If you do not agree with the terms of this privacy
                  policy, please do not access the site.
                </p>
              </div>

              {/* Information We Collect */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Information We Collect</h2>

                <h3 className="text-2xl font-semibold mb-3 mt-6">Personal Data</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  When you register for an account, we may collect personally identifiable information, including:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Name and email address</li>
                  <li>Username and password</li>
                  <li>Profile information (optional: avatar, bio, location)</li>
                  <li>Content you create (routes, reviews, photos, audio guides)</li>
                </ul>

                <h3 className="text-2xl font-semibold mb-3 mt-6">Usage Data</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We automatically collect certain information when you visit, use, or navigate our website:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>IP address and browser type</li>
                  <li>Device information and operating system</li>
                  <li>Pages visited and time spent on pages</li>
                  <li>Referring URLs and clickstream data</li>
                </ul>

                <h3 className="text-2xl font-semibold mb-3 mt-6">Location Data</h3>
                <p className="text-muted-foreground leading-relaxed">
                  With your permission, we may collect location data to provide location-based features such
                  as nearby buildings and personalized route recommendations.
                </p>
              </div>

              {/* How We Use Information */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">How We Use Your Information</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Create and manage your account</li>
                  <li>Provide, operate, and maintain our services</li>
                  <li>Improve, personalize, and expand our services</li>
                  <li>Understand and analyze how you use our website</li>
                  <li>Develop new products, services, features, and functionality</li>
                  <li>Communicate with you for customer service, updates, and marketing</li>
                  <li>Process your transactions and manage your orders</li>
                  <li>Send you newsletters and promotional materials (with your consent)</li>
                  <li>Find and prevent fraud and security issues</li>
                </ul>
              </div>

              {/* Sharing Information */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Sharing Your Information</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We may share your information in the following situations:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Public Content:</strong> Content you post publicly (routes, reviews, photos) is visible to other users</li>
                  <li><strong>Service Providers:</strong> We may share data with third-party service providers who perform services on our behalf</li>
                  <li><strong>Legal Requirements:</strong> We may disclose information if required by law or in response to valid requests</li>
                  <li><strong>Business Transfers:</strong> Information may be transferred in connection with a merger, sale, or acquisition</li>
                </ul>
              </div>

              {/* Cookies and Tracking */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Cookies and Tracking Technologies</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We use cookies and similar tracking technologies to track activity on our service and store
                  certain information. You can instruct your browser to refuse all cookies or to indicate when
                  a cookie is being sent.
                </p>
              </div>

              {/* Data Security */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Data Security</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use administrative, technical, and physical security measures to protect your personal
                  information. However, no method of transmission over the Internet or electronic storage is
                  100% secure. While we strive to use commercially acceptable means to protect your personal
                  information, we cannot guarantee absolute security.
                </p>
              </div>

              {/* Your Rights */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Your Privacy Rights</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Depending on your location, you may have the following rights:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Access to your personal data</li>
                  <li>Correction of inaccurate data</li>
                  <li>Deletion of your data ("right to be forgotten")</li>
                  <li>Restriction of processing</li>
                  <li>Data portability</li>
                  <li>Object to processing</li>
                  <li>Withdraw consent at any time</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  To exercise these rights, please contact us at <a href="mailto:info@archiroutes.com" className="text-primary hover:underline">info@archiroutes.com</a>
                </p>
              </div>

              {/* Third-Party Links */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Third-Party Websites</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our website may contain links to third-party websites. We are not responsible for the privacy
                  practices or content of these external sites. We encourage you to read the privacy policies of
                  any third-party sites you visit.
                </p>
              </div>

              {/* Children's Privacy */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Children's Privacy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our services are not intended for individuals under the age of 13. We do not knowingly collect
                  personal information from children under 13. If you are a parent or guardian and believe your
                  child has provided us with personal information, please contact us.
                </p>
              </div>

              {/* Changes to Policy */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Changes to This Privacy Policy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update our Privacy Policy from time to time. We will notify you of any changes by posting
                  the new Privacy Policy on this page and updating the "Last updated" date. You are advised to
                  review this Privacy Policy periodically for any changes.
                </p>
              </div>

              {/* Contact */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  If you have any questions about this Privacy Policy, please contact us:
                </p>
                <ul className="list-none text-muted-foreground space-y-2">
                  <li>Email: <a href="mailto:info@archiroutes.com" className="text-primary hover:underline">info@archiroutes.com</a></li>
                  <li>Contact Form: <Link href="/contact" className="text-primary hover:underline">Visit our contact page</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <EnhancedFooter />
    </div>
  )
}
