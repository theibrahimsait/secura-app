
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const Privacy = () => {
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
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-secura-black mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Last updated: January 1, 2025
          </p>
        </div>

        <div className="prose prose-lg max-w-none">
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Quri Technologies FZ-LLC ("we," "our," or "us") operates the Secura platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our secure document sharing service for real estate agencies in the UAE.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">2. Information We Collect</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-secura-black mb-2">Personal Information</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We collect information you provide directly to us, such as when you create an account, upload documents, or contact us for support. This may include your name, email address, phone number, company information, and professional credentials.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-secura-black mb-2">Document Information</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We process documents you upload to our platform, including metadata, file types, and access logs. All documents are encrypted and stored securely in compliance with UAE data protection regulations.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-secura-black mb-2">Usage Information</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We automatically collect information about how you use our service, including IP addresses, browser type, operating system, access times, and pages viewed.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">3. How We Use Your Information</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Provide, operate, and maintain our secure document sharing service</li>
                <li>• Process and facilitate document uploads, sharing, and access</li>
                <li>• Communicate with you about your account and our services</li>
                <li>• Ensure security and prevent unauthorized access</li>
                <li>• Comply with legal obligations and regulatory requirements</li>
                <li>• Improve our services and develop new features</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">4. Information Sharing</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We do not sell, trade, or otherwise transfer your personal information to outside parties except as described in this policy:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li>• With your explicit consent</li>
                <li>• To comply with legal obligations or court orders</li>
                <li>• To protect our rights, property, or safety</li>
                <li>• With trusted service providers who assist in operating our platform</li>
                <li>• In connection with a business transfer or merger</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">5. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement robust security measures including end-to-end encryption, secure data centers, regular security audits, and compliance with UAE Personal Data Protection Law (PDPL). All documents are encrypted both in transit and at rest using industry-standard encryption protocols.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">6. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your information only as long as necessary to provide our services and comply with legal obligations. Documents are retained according to your account settings and applicable legal requirements for real estate transactions in the UAE.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">7. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Under UAE PDPL, you have the right to:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Access your personal information</li>
                <li>• Correct inaccurate or incomplete data</li>
                <li>• Delete your personal information</li>
                <li>• Object to certain processing activities</li>
                <li>• Data portability</li>
                <li>• Withdraw consent where applicable</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">8. International Transfers</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your data is primarily stored and processed within the UAE. Any international transfers are conducted in accordance with UAE PDPL requirements and with appropriate safeguards in place.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">9. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="mt-4 text-muted-foreground">
                <p>Email: privacy@secura.me</p>
                <p>Phone: +971 4 555 1234</p>
                <p>Address: Dubai Internet City, Dubai, UAE</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-secura-black mb-4">10. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
