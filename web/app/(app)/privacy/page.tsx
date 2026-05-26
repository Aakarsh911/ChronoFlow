import Link from 'next/link'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-block">
            ← Back to Login
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-slate-600">Last updated: November 4, 2025</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Introduction</h2>
            <p className="text-slate-700 leading-relaxed">
              ChronoFlow ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our productivity and email management application. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-slate-800 mb-3">1. Information You Provide</h3>
            <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
              <li><strong>Account Information:</strong> Email address, name, and profile picture from your Google, Microsoft, or Atlassian account</li>
              <li><strong>User Preferences:</strong> Settings, configurations, and customizations you make within the application</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">2. Information We Collect Automatically</h3>
            <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
              <li><strong>Email Data:</strong> Email messages, metadata (subject, sender, date, labels), and attachments from Gmail and Outlook</li>
              <li><strong>Calendar Data:</strong> Calendar events, attendees, meeting details from Google Calendar, Outlook Calendar, and Microsoft Teams</li>
              <li><strong>Task Data:</strong> Tasks, deadlines, priorities, and task metadata from your connected services</li>
              <li><strong>Team Data:</strong> Team member information, availability, and basic organizational data from Microsoft Teams</li>
              <li><strong>Usage Data:</strong> How you interact with the application, features used, and performance data</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">How We Use Your Information</h2>
            <p className="text-slate-700 mb-4">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
              <li><strong>Provide Core Features:</strong> Display emails, manage calendar events, create and track tasks</li>
              <li><strong>AI-Powered Features:</strong> Extract actionable tasks from emails, generate email replies, create summaries, and provide intelligent insights</li>
              <li><strong>Improve Services:</strong> Analyze usage patterns to enhance functionality and user experience</li>
              <li><strong>Communication:</strong> Send emails on your behalf when you explicitly request it</li>
              <li><strong>Integration Management:</strong> Connect and sync data with Google, Microsoft, and Atlassian services</li>
            </ul>
          </section>

          {/* Third-Party AI Processing - CRITICAL DISCLOSURE */}
          <section className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">🤖 Third-Party AI Processing</h2>
            <div className="space-y-4 text-slate-700">
              <p className="font-semibold">
                ChronoFlow uses third-party artificial intelligence services to provide smart features. Your explicit consent is required before we process your data with AI.
              </p>
              
              <div className="bg-white rounded p-4 space-y-3">
                <h3 className="font-semibold text-slate-900">AI Services We Use:</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>AWS Bedrock (OpenAI GPT):</strong> Email task extraction, reply generation, and AI chat assistance</li>
                </ul>
              </div>
              
              <div className="bg-green-50 rounded p-4 border border-green-200 space-y-2">
                <h3 className="font-semibold text-green-900">✓ Data Protection Guarantee</h3>
                <p className="text-sm text-slate-700">
                  <strong>Your data is NOT used for AI model training.</strong> AWS Bedrock does not store, log, or use your data to train or improve AI models. Your email and calendar content is processed only to provide the specific feature you requested, then immediately discarded.
                </p>
              </div>

              <div className="bg-white rounded p-4 space-y-3">
                <h3 className="font-semibold text-slate-900">What Data is Shared with AI Services:</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Email subject lines and body content (when extracting tasks or generating replies)</li>
                  <li>Sender information (name and email address)</li>
                  <li>Calendar event details (when scheduling meetings)</li>
                  <li>Task descriptions (when creating Jira tickets)</li>
                </ul>
              </div>

              <div className="bg-white rounded p-4 space-y-3">
                <h3 className="font-semibold text-slate-900">Important Notes:</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>AI processing only occurs when you explicitly use AI features (e.g., "Extract Tasks", "Generate Reply")</li>
                  <li>You will be prompted for consent before any AI processing begins</li>
                  <li>You can revoke AI consent at any time in Settings</li>
                  <li><strong>Your data is NOT used to train AI models</strong> - AWS Bedrock does not use customer data for training</li>
                  <li>We do not store AI-processed data longer than necessary to provide the service</li>
                  <li>Data is processed according to AWS Bedrock's privacy policies</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Sharing and Disclosure */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Data Sharing and Disclosure</h2>
            <p className="text-slate-700 mb-4">We do not sell, rent, or trade your personal information. We may share your data only in these circumstances:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
              <li><strong>With Your Consent:</strong> When you explicitly authorize AI processing or other data sharing</li>
              <li><strong>Service Providers:</strong> Third-party services that help us operate (Google Gemini, AWS Bedrock, hosting providers)</li>
              <li><strong>Legal Requirements:</strong> When required by law, legal process, or government request</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          {/* Data Storage and Security */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Data Storage and Security</h2>
            <div className="space-y-4 text-slate-700">
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Where Your Data is Stored:</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Application Database:</strong> User accounts, tasks, integration tokens (encrypted)</li>
                  <li><strong>Redis Cache:</strong> Temporary storage of email and calendar data (5-10 minutes, automatically expires)</li>
                  <li><strong>Your Accounts:</strong> Email and calendar data remains primarily in your Gmail/Outlook/Teams accounts</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Security Measures:</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>256-bit encryption for data in transit (TLS/SSL)</li>
                  <li>Encrypted storage of access tokens and sensitive credentials</li>
                  <li>OAuth 2.0 authentication (no password storage)</li>
                  <li>Regular security audits and updates</li>
                  <li>SOC 2 compliance practices</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Data Retention</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
              <li><strong>Email/Calendar Cache:</strong> 5-10 minutes (auto-deleted)</li>
              <li><strong>Tasks:</strong> Until you delete them or delete your account</li>
              <li><strong>Integration Tokens:</strong> Until you disconnect the integration or delete your account</li>
              <li><strong>Account Data:</strong> Until you request account deletion</li>
              <li><strong>AI Processing:</strong> Data is not retained after processing completes and is never used for model training</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Your Rights</h2>
            <p className="text-slate-700 mb-4">You have the following rights regarding your data:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your account and all associated data</li>
              <li><strong>Portability:</strong> Export your tasks and data</li>
              <li><strong>Revoke Consent:</strong> Withdraw AI processing consent at any time</li>
              <li><strong>Disconnect Integrations:</strong> Remove access to Gmail, Outlook, Teams, or Jira at any time</li>
            </ul>
            <p className="text-slate-700 mt-4">
              To exercise these rights, visit your Settings page or contact us at privacy@chronoflow.com
            </p>
          </section>

          {/* Google API Services User Data Policy */}
          <section className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Google API Services User Data Policy Compliance</h2>
            <p className="text-slate-700 mb-4">
              ChronoFlow's use and transfer of information received from Google APIs adheres to the{' '}
              <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">
                Google API Services User Data Policy
              </a>, including the Limited Use requirements.
            </p>
            <div className="space-y-3 text-slate-700">
              <p><strong>Limited Use Disclosure:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>We only request the minimum scopes necessary to provide our services</li>
                <li>Gmail data is used solely for features you explicitly request (reading emails, sending emails, managing labels)</li>
                <li>We do not use Gmail data for serving advertisements</li>
                <li>We do not allow humans to read your email data except as required for security or compliance purposes</li>
                <li>Email data shared with AI services is only for processing your explicit requests (task extraction, reply generation)</li>
              </ul>
            </div>
          </section>

          {/* Third-Party Links */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Third-Party Services</h2>
            <p className="text-slate-700 mb-4">ChronoFlow integrates with:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
              <li><strong>Google:</strong> Gmail, Google Calendar - <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Privacy Policy</a></li>
              <li><strong>Microsoft:</strong> Outlook, Microsoft Teams - <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Privacy Policy</a></li>
              <li><strong>Atlassian:</strong> Jira - <a href="https://www.atlassian.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Privacy Policy</a></li>
              <li><strong>AWS Bedrock (OpenAI):</strong> AI Processing - <a href="https://aws.amazon.com/bedrock/data-protection/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">AWS Bedrock Data Protection</a>, <a href="https://aws.amazon.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">AWS Privacy</a></li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Children's Privacy</h2>
            <p className="text-slate-700">
              ChronoFlow is not intended for use by children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
            </p>
          </section>

          {/* International Users */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">International Users</h2>
            <p className="text-slate-700">
              ChronoFlow is operated from the United States. If you are accessing our service from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States. By using ChronoFlow, you consent to this transfer.
            </p>
          </section>

          {/* GDPR & CCPA */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">GDPR & CCPA Rights</h2>
            <p className="text-slate-700 mb-4">
              If you are a resident of the European Economic Area (EEA) or California, you have additional rights:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
              <li>Right to know what personal data we collect and how it's used</li>
              <li>Right to request deletion of your personal data</li>
              <li>Right to opt-out of data sharing (including AI processing)</li>
              <li>Right to non-discrimination for exercising your privacy rights</li>
              <li>Right to data portability</li>
            </ul>
          </section>

          {/* Changes to Privacy Policy */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Changes to This Privacy Policy</h2>
            <p className="text-slate-700">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Continued use of ChronoFlow after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-slate-50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Contact Us</h2>
            <p className="text-slate-700 mb-4">
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="text-slate-700 space-y-2">
              <p><strong>Email:</strong> privacy@chronoflow.com</p>
              <p><strong>Support:</strong> support@chronoflow.com</p>
              <p><strong>Data Protection Officer:</strong> dpo@chronoflow.com</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

