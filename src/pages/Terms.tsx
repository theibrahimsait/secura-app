
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

const Terms = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="https://ngmwdebxyofxudrbesqs.supabase.co/storage/v1/object/public/nullstack//securaa.svg" alt="Secura" className="h-8 w-auto" />
            </div>
            <Link to="/" className="flex items-center space-x-2 text-secura-teal hover:text-secura-moss transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl secura-gradient flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-secura-black mb-4">Terms of Service</h1>
          <p className="text-muted-foreground">
            Last updated: January 1, 2025
          </p>
        </div>

        <div className="prose prose-lg max-w-none">
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">1. Agreement to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using the Secura platform operated by Quri Technologies FZ-LLC, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                Secura is a secure document sharing platform designed specifically for UAE real estate agencies. Our service enables secure upload, storage, sharing, and management of property-related documents with end-to-end encryption and compliance with UAE regulations.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">3. User Accounts and Registration</h2>
              <div className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  To access our services, you must register for an account. You agree to:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Provide accurate, current, and complete information</li>
                  <li>• Maintain and update your account information</li>
                  <li>• Maintain the security of your account credentials</li>
                  <li>• Accept responsibility for all activities under your account</li>
                  <li>• Notify us immediately of any unauthorized access</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">4. Acceptable Use Policy</h2>
              <div className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  You agree to use Secura only for lawful purposes and in accordance with these Terms. You must not:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Upload or share illegal, harmful, or infringing content</li>
                  <li>• Attempt to gain unauthorized access to our systems</li>
                  <li>• Use the service for any fraudulent or deceptive practices</li>
                  <li>• Interfere with or disrupt the service or servers</li>
                  <li>• Upload viruses, malware, or other malicious code</li>
                  <li>• Share your account credentials with unauthorized users</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">5. Document Storage and Sharing</h2>
              <div className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  By uploading documents to Secura, you confirm that:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• You have the right to upload and share the documents</li>
                  <li>• The documents comply with UAE laws and regulations</li>
                  <li>• You understand documents are encrypted and stored securely</li>
                  <li>• You are responsible for managing document access permissions</li>
                  <li>• You agree to maintain confidentiality of sensitive information</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">6. Privacy and Data Protection</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference. We comply with UAE Personal Data Protection Law (PDPL) and implement appropriate security measures.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">7. Intellectual Property Rights</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Secura platform, including its software, design, content, and trademarks, is owned by Quri Technologies FZ-LLC and protected by intellectual property laws. You retain ownership of your uploaded documents, but grant us a limited license to process and store them as necessary to provide our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">8. Service Availability and Modifications</h2>
              <p className="text-muted-foreground leading-relaxed">
                We strive to maintain high service availability but cannot guarantee uninterrupted access. We reserve the right to modify, suspend, or discontinue any aspect of the service with reasonable notice. We may also update these Terms periodically.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">9. Subscription and Payment Terms</h2>
              <div className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  If you subscribe to our paid services:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Fees are payable in advance for the selected billing period</li>
                  <li>• Subscriptions automatically renew unless cancelled</li>
                  <li>• Refunds are subject to our refund policy</li>
                  <li>• We may change pricing with 30 days' notice</li>
                  <li>• Non-payment may result in service suspension</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">10. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                To the maximum extent permitted by UAE law, Quri Technologies FZ-LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or use, incurred by you or any third party, whether in contract, tort, or otherwise.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">11. Indemnification</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to indemnify and hold harmless Quri Technologies FZ-LLC from any claims, damages, losses, and expenses arising from your use of the service, violation of these Terms, or infringement of any rights of another party.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">12. Governing Law and Dispute Resolution</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms are governed by the laws of the United Arab Emirates. Any disputes arising from these Terms or your use of the service shall be resolved through arbitration in Dubai, UAE, in accordance with the Dubai International Arbitration Centre (DIAC) rules.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">13. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may terminate or suspend your account and access to the service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties. You may also terminate your account at any time through your account settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">14. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="mt-4 text-muted-foreground">
                <p>Email: legal@secura.me</p>
                <p>Phone: +971 4 555 1234</p>
                <p>Address: Dubai Internet City, Dubai, UAE</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">15. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify users of any material changes by email or through the service. Your continued use of the service after changes become effective constitutes acceptance of the new Terms.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
