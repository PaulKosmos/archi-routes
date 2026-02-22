import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Use - ArchiRoutes',
  description: 'ArchiRoutes Terms of Use - Read our terms and conditions for using our platform.',
}

export default function TermsPage() {
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
              Terms of <span className="text-primary">Use</span>
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
                <h2 className="text-3xl font-bold mb-4">Agreement to Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  These Terms of Use constitute a legally binding agreement between you and ArchiRoutes
                  ("Company," "we," "us," or "our") concerning your access to and use of the ArchiRoutes
                  website and services. By accessing or using our services, you agree to be bound by these
                  Terms. If you disagree with any part of these terms, you may not access the service.
                </p>
              </div>

              {/* Intellectual Property */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Intellectual Property Rights</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Unless otherwise indicated, the Site is our proprietary property and all source code,
                  databases, functionality, software, website designs, audio, video, text, photographs,
                  and graphics on the Site (collectively, the "Content") and the trademarks, service marks,
                  and logos contained therein (the "Marks") are owned or controlled by us or licensed to us.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  The Content and the Marks are protected by copyright and trademark laws. You are granted a
                  limited license only for purposes of viewing the material contained on this Site.
                </p>
              </div>

              {/* User Representations */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">User Representations</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  By using the Site, you represent and warrant that:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>All registration information you submit will be true, accurate, current, and complete</li>
                  <li>You will maintain the accuracy of such information</li>
                  <li>You have the legal capacity and agree to comply with these Terms</li>
                  <li>You are not a minor in the jurisdiction in which you reside</li>
                  <li>You will not access the Site through automated or non-human means</li>
                  <li>You will not use the Site for any illegal or unauthorized purpose</li>
                  <li>Your use of the Site will not violate any applicable law or regulation</li>
                </ul>
              </div>

              {/* User Registration */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">User Registration</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You may be required to register with the Site. You agree to keep your password confidential
                  and will be responsible for all use of your account and password. We reserve the right to
                  remove, reclaim, or change a username you select if we determine, in our sole discretion,
                  that such username is inappropriate, obscene, or otherwise objectionable.
                </p>
              </div>

              {/* Prohibited Activities */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Prohibited Activities</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  You may not access or use the Site for any purpose other than that for which we make the
                  Site available. The Site may not be used in connection with any commercial endeavors except
                  those that are specifically endorsed or approved by us. As a user of the Site, you agree not to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Systematically retrieve data or content from the Site to create a collection or database</li>
                  <li>Circumvent, disable, or interfere with security-related features of the Site</li>
                  <li>Engage in unauthorized framing or linking to the Site</li>
                  <li>Trick, defraud, or mislead us and other users</li>
                  <li>Make improper use of our support services or submit false reports</li>
                  <li>Engage in any automated use of the system</li>
                  <li>Interfere with, disrupt, or create an undue burden on the Site</li>
                  <li>Attempt to impersonate another user or person</li>
                  <li>Sell or transfer your profile</li>
                  <li>Use the Site to advertise or offer to sell goods and services</li>
                  <li>Upload or transmit viruses, malware, or other malicious code</li>
                  <li>Harass, annoy, intimidate, or threaten any of our employees or users</li>
                  <li>Delete copyright or other proprietary rights notices</li>
                  <li>Copy or adapt the Site's software</li>
                  <li>Decipher, decompile, or reverse engineer any of the software</li>
                  <li>Use the Site in a manner inconsistent with applicable laws</li>
                </ul>
              </div>

              {/* User Generated Contributions */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">User Generated Contributions</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  The Site may provide you with the opportunity to create, submit, post, display, transmit,
                  perform, publish, distribute, or broadcast content including but not limited to text,
                  writings, video, audio, photographs, graphics, comments, routes, reviews, or other material
                  (collectively, "Contributions").
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  By posting Contributions, you grant us the right and license to use, modify, publicly perform,
                  publicly display, reproduce, and distribute such Contributions on and through the Site. You
                  represent and warrant that:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>You created or own the necessary rights to the Contributions</li>
                  <li>Your Contributions do not infringe third-party intellectual property rights</li>
                  <li>Your Contributions are not false, inaccurate, or misleading</li>
                  <li>Your Contributions are not unsolicited or unauthorized advertising</li>
                  <li>Your Contributions do not violate any applicable law</li>
                </ul>
              </div>

              {/* Contribution License */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Contribution License</h2>
                <p className="text-muted-foreground leading-relaxed">
                  By posting your Contributions to any part of the Site, you automatically grant us an
                  unrestricted, unlimited, irrevocable, perpetual, non-exclusive, transferable, royalty-free,
                  fully-paid, worldwide right, and license to host, use, copy, reproduce, disclose, sell, resell,
                  publish, broadcast, retitle, archive, store, cache, publicly perform, publicly display, reformat,
                  translate, transmit, excerpt (in whole or in part), and distribute such Contributions for any
                  purpose, commercial, advertising, or otherwise, and to prepare derivative works of, or incorporate
                  into other works, such Contributions.
                </p>
              </div>

              {/* Site Management */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Site Management</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We reserve the right, but not the obligation, to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Monitor the Site for violations of these Terms</li>
                  <li>Take appropriate legal action against anyone who violates the law or these Terms</li>
                  <li>Refuse, restrict access to, or disable any Contributions</li>
                  <li>Remove files and content that are excessive in size or burdensome</li>
                  <li>Manage the Site in a manner designed to protect our rights and facilitate proper functioning</li>
                </ul>
              </div>

              {/* Privacy Policy */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Privacy Policy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We care about data privacy and security. Please review our{' '}
                  <Link href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                  . By using the Site, you agree to be bound by our Privacy Policy.
                </p>
              </div>

              {/* Term and Termination */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Term and Termination</h2>
                <p className="text-muted-foreground leading-relaxed">
                  These Terms shall remain in full force and effect while you use the Site. We may terminate or
                  suspend your account and bar access to the Site immediately, without prior notice or liability,
                  for any reason, including without limitation if you breach the Terms.
                </p>
              </div>

              {/* Modifications and Interruptions */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Modifications and Interruptions</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to change, modify, or remove the contents of the Site at any time for any
                  reason at our sole discretion without notice. We also reserve the right to modify or discontinue
                  all or part of the Site without notice. We will not be liable for any modification, suspension,
                  or discontinuance of the Site.
                </p>
              </div>

              {/* Disclaimers */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Disclaimers</h2>
                <p className="text-muted-foreground leading-relaxed">
                  THE SITE IS PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT YOUR USE OF THE SITE
                  AND OUR SERVICES WILL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM
                  ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE SITE AND YOUR USE THEREOF.
                </p>
              </div>

              {/* Limitations of Liability */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Limitations of Liability</h2>
                <p className="text-muted-foreground leading-relaxed">
                  IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY
                  FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES,
                  INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM YOUR USE OF THE SITE.
                </p>
              </div>

              {/* Indemnification */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Indemnification</h2>
                <p className="text-muted-foreground leading-relaxed">
                  You agree to defend, indemnify, and hold us harmless from and against any loss, damage, liability,
                  claim, or demand, including reasonable attorneys' fees and expenses, made by any third party due to
                  or arising out of: (1) your Contributions; (2) use of the Site; (3) breach of these Terms; (4) any
                  breach of your representations and warranties; (5) your violation of the rights of a third party.
                </p>
              </div>

              {/* Governing Law */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Governing Law</h2>
                <p className="text-muted-foreground leading-relaxed">
                  These Terms shall be governed by and defined following the laws of Germany. ArchiRoutes and yourself
                  irrevocably consent that the courts of Germany shall have exclusive jurisdiction to resolve any
                  dispute which may arise in connection with these terms.
                </p>
              </div>

              {/* Contact */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-4">Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  If you have any questions about these Terms of Use, please contact us:
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
