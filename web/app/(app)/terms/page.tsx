import Link from 'next/link'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-block">
            ← Back to Login
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Terms of Service</h1>
          <p className="text-slate-600">Last updated: November 4, 2025</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Agreement to Terms</h2>
            <p className="text-slate-700 leading-relaxed">
              These Terms of Service ("Terms") govern your access to and use of ChronoFlow ("Service", "we", "our", or "us"), a productivity and email management application. By accessing or using ChronoFlow, you agree to be bound by these Terms. If you do not agree to these Terms, do not use the Service.
            </p>
          </section>

          {/* Service Description */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Service Description</h2>
            <p className="text-slate-700 mb-4">ChronoFlow provides:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
              <li>Unified inbox for Gmail and Outlook email management</li>
              <li>Calendar integration with Google Calendar, Outlook, and Microsoft Teams</li>
              <li>Task management and extraction from emails</li>
              <li>AI-powered email reply generation and task extraction</li>
              <li>Team scheduling and availability management</li>
              <li>Jira integration for ticket creation</li>
              <li>Focus time tracking and productivity tools</li>
            </ul>
          </section>

          {/* Account Registration */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Account Registration and Security</h2>
            <div className="space-y-4 text-slate-700">
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Registration Requirements:</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>You must be at least 13 years old to use ChronoFlow</li>
                  <li>You must provide accurate and complete information</li>
                  <li>You must have a valid Google, Microsoft, or Atlassian account</li>
                  <li>One person or legal entity may maintain only one account</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Account Security:</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>You are responsible for maintaining the security of your account</li>
                  <li>You are responsible for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized access</li>
                  <li>We are not liable for losses from unauthorized account use</li>
                </ul>
              </div>
            </div>
          </section>

          {/* AI Services */}
          <section className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">AI Services and Consent</h2>
            <div className="space-y-4 text-slate-700">
              <p>
                ChronoFlow offers AI-powered features that process your email and calendar data using AWS Bedrock with OpenAI GPT.
              </p>
              
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900">
                  ✓ Your data is NOT used to train AI models. AWS Bedrock does not store, retain, or use your data for model training purposes.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">By Using AI Features, You Agree That:</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Your data will be sent to third-party AI services for processing</li>
                  <li>AI-generated content may contain errors or inaccuracies</li>
                  <li>You are responsible for reviewing AI-generated content before use</li>
                  <li>You understand AI processing limitations and risks</li>
                  <li>You can revoke AI consent at any time in Settings</li>
                </ul>
              </div>

              <p className="font-semibold">
                We will explicitly request your consent before enabling AI features for the first time.
              </p>
            </div>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Acceptable Use Policy</h2>
            <p className="text-slate-700 mb-4">You agree NOT to:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Send spam, malware, or malicious content</li>
              <li>Harass, abuse, or harm others</li>
              <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
              <li>Reverse engineer, decompile, or attempt to extract source code</li>
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Scrape, data mine, or use automated systems to access the Service</li>
              <li>Interfere with or disrupt the Service's functionality</li>
              <li>Impersonate any person or entity</li>
            </ul>
          </section>

          {/* Third-Party Integrations */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Third-Party Integrations</h2>
            <div className="space-y-4 text-slate-700">
              <p>
                ChronoFlow integrates with Google, Microsoft, and Atlassian services. By connecting these integrations:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You grant ChronoFlow permission to access your data as specified in the OAuth consent</li>
                <li>You agree to the terms and privacy policies of these third-party services</li>
                <li>We are not responsible for third-party service availability, changes, or termination</li>
                <li>You can disconnect integrations at any time</li>
                <li>We may suspend Service if third-party access is revoked or unavailable</li>
              </ul>
            </div>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Intellectual Property Rights</h2>
            <div className="space-y-4 text-slate-700">
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Our Rights:</h3>
                <p>
                  ChronoFlow and its content, features, and functionality are owned by us and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our express permission.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Your Rights:</h3>
                <p>
                  You retain all rights to your email, calendar, task, and other data. By using ChronoFlow, you grant us a limited license to access, process, and display your data solely to provide the Service.
                </p>
              </div>
            </div>
          </section>

          {/* Payment and Subscriptions */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Payment and Subscriptions</h2>
            <div className="space-y-4 text-slate-700">
              <p>
                ChronoFlow may offer free and paid subscription plans in the future. Current terms:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>All fees are in USD and non-refundable unless required by law</li>
                <li>We reserve the right to change pricing with 30 days notice</li>
                <li>You can cancel your subscription at any time</li>
                <li>Access continues until the end of the current billing period after cancellation</li>
                <li>We may offer free trials or promotional pricing at our discretion</li>
              </ul>
            </div>
          </section>

          {/* Disclaimer of Warranties */}
          <section className="border-2 border-yellow-200 rounded-lg p-6 bg-yellow-50">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Disclaimer of Warranties</h2>
            <div className="space-y-3 text-slate-700">
              <p className="font-semibold uppercase">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
              </p>
              <p>
                We do not warrant that:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>The Service will be uninterrupted, secure, or error-free</li>
                <li>The results obtained from the Service will be accurate or reliable</li>
                <li>AI-generated content will be accurate, appropriate, or complete</li>
                <li>Any errors or defects will be corrected</li>
                <li>The Service will meet your specific requirements</li>
              </ul>
            </div>
          </section>

          {/* Limitation of Liability */}
          <section className="border-2 border-red-200 rounded-lg p-6 bg-red-50">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Limitation of Liability</h2>
            <div className="space-y-3 text-slate-700">
              <p className="font-semibold uppercase">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, CHRONOFLOW SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
              </p>
              <p>
                This includes damages resulting from:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Use or inability to use the Service</li>
                <li>Unauthorized access to or alteration of your data</li>
                <li>Third-party conduct or content on the Service</li>
                <li>Errors in AI-generated content</li>
                <li>Service interruptions or termination</li>
              </ul>
              <p className="font-semibold mt-4">
                OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS, OR $100, WHICHEVER IS GREATER.
              </p>
            </div>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Indemnification</h2>
            <p className="text-slate-700">
              You agree to defend, indemnify, and hold harmless ChronoFlow and its employees, contractors, and affiliates from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4 mt-4">
              <li>Your use or misuse of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Any content you submit through the Service</li>
            </ul>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Termination</h2>
            <div className="space-y-4 text-slate-700">
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Your Right to Terminate:</h3>
                <p>
                  You may terminate your account at any time by using the account deletion feature in Settings. Upon termination, your data will be deleted within 30 days.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Our Right to Terminate:</h3>
                <p>
                  We may suspend or terminate your access immediately, without notice, for:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                  <li>Violation of these Terms</li>
                  <li>Fraudulent or illegal activity</li>
                  <li>Extended periods of inactivity</li>
                  <li>Discontinuation of the Service</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Changes to Terms</h2>
            <p className="text-slate-700">
              We reserve the right to modify these Terms at any time. We will notify users of material changes via email or through the Service. Continued use after changes constitutes acceptance of the updated Terms. If you do not agree to the modified Terms, you must stop using the Service.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Governing Law and Dispute Resolution</h2>
            <div className="space-y-4 text-slate-700">
              <p>
                These Terms are governed by the laws of the United States and the State of Delaware, without regard to conflict of law principles.
              </p>
              <p>
                Any disputes arising from these Terms or the Service shall be resolved through:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Good faith negotiation between the parties</li>
                <li>Binding arbitration if negotiation fails (except for injunctive relief)</li>
                <li>You waive the right to participate in class actions or class arbitrations</li>
              </ol>
            </div>
          </section>

          {/* Miscellaneous */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Miscellaneous</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
              <li><strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and ChronoFlow</li>
              <li><strong>Severability:</strong> If any provision is found unenforceable, the remaining provisions remain in effect</li>
              <li><strong>Waiver:</strong> Failure to enforce any provision does not constitute a waiver</li>
              <li><strong>Assignment:</strong> You may not assign these Terms without our consent</li>
              <li><strong>Force Majeure:</strong> We are not liable for delays or failures due to events beyond our control</li>
            </ul>
          </section>

          {/* Contact */}
          <section className="bg-slate-50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Contact Us</h2>
            <p className="text-slate-700 mb-4">
              If you have questions about these Terms of Service, please contact us:
            </p>
            <div className="text-slate-700 space-y-2">
              <p><strong>Email:</strong> legal@chronoflow.com</p>
              <p><strong>Support:</strong> support@chronoflow.com</p>
            </div>
          </section>

          {/* Acknowledgment */}
          <section className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Acknowledgment</h2>
            <p className="text-slate-700">
              BY USING CHRONOFLOW, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS OF SERVICE, UNDERSTAND THEM, AND AGREE TO BE BOUND BY THEM. IF YOU DO NOT AGREE TO THESE TERMS, DO NOT USE THE SERVICE.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

