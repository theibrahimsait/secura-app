
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowRight, Lock, Users, FileText, Mail, MapPin, Phone } from 'lucide-react';

const Index = () => {
  return <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="https://ngmwdebxyofxudrbesqs.supabase.co/storage/v1/object/public/nullstack//securaa.svg" alt="Secura" className="h-8 w-auto" />
            </div>
            <Link to="/login">
              <Button className="bg-secura-lime hover:bg-secura-lime/90 text-secura-teal font-semibold transition-all duration-300 hover:scale-105">
                Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-7xl font-bold text-secura-black leading-tight">
                  Secure Document
                  <span className="block text-secura-teal">Sharing</span>
                  <span className="block">for Real Estate</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl">
                  Stop sharing sensitive property documents through WhatsApp. 
                  Secura provides a secure, compliant platform for UAE real estate agencies 
                  to safely collect and manage client documents.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login">
                  <Button size="lg" className="bg-secura-lime hover:bg-secura-lime/90 text-secura-teal font-semibold px-8 py-4 text-lg rounded-xl transition-all duration-300 hover:scale-105">
                    Access Portal
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <a href="https://secura.me" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="lg" className="border-secura-moss text-secura-black hover:bg-secura-moss/10 px-8 py-4 text-lg rounded-xl transition-all duration-300 hover:scale-105">
                    Learn More
                  </Button>
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center space-x-6 pt-8">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-secura-teal" />
                  <span className="text-sm text-muted-foreground">UAE PDPL Compliant</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Lock className="h-5 w-5 text-secura-teal" />
                  <span className="text-sm text-muted-foreground">End-to-End Encrypted</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-secura-teal" />
                  <span className="text-sm text-muted-foreground">Complete Audit Trail</span>
                </div>
              </div>
            </div>

            <div className="lg:pl-12 animate-slide-up">
              <div className="relative">
                <div className="absolute inset-0 secura-gradient rounded-3xl transform rotate-6 opacity-20"></div>
                <Card className="relative shadow-2xl border-0 bg-white/95 backdrop-blur-sm rounded-3xl overflow-hidden">
                  <div className="p-8">
                    <div className="space-y-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl secura-gradient flex items-center justify-center">
                          <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-secura-black">Secure Upload</h3>
                          <p className="text-sm text-muted-foreground">Client documents safely stored</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="h-4 bg-secura-mint/30 rounded-full overflow-hidden">
                          <div className="h-full w-3/4 bg-secura-lime rounded-full"></div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Upload Progress</span>
                          <span className="text-secura-teal font-medium">75%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-secura-black mb-4">
              Why Choose Secura?
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Built specifically for UAE real estate agencies, with compliance and security at its core
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 rounded-2xl">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 rounded-2xl bg-secura-lime/10 flex items-center justify-center mb-4 bg-lime-100">
                  <Shield className="w-8 h-8 text-secura-teal" />
                </div>
                <CardTitle className="text-xl text-secura-black">Secure by Design</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  End-to-end encryption, secure links with expiration, and role-based access control 
                  ensure your clients' documents are always protected.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 rounded-2xl">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 rounded-2xl bg-secura-mint/20 flex items-center justify-center mb-4 bg-lime-100">
                  <Users className="w-8 h-8 text-secura-moss" />
                </div>
                <CardTitle className="text-xl text-secura-black">Multi-Level Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">Agency admin, and agent dashboards with appropriate access levels. Perfect for managing multiple agents and maintaining oversight.</CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 rounded-2xl">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 rounded-2xl bg-secura-teal/10 flex items-center justify-center mb-4 bg-lime-100">
                  <FileText className="w-8 h-8 text-secura-teal" />
                </div>
                <CardTitle className="text-xl text-secura-black">Complete Audit Trail</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Track every document access, download, and modification. 
                  Full compliance reporting for regulatory requirements.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secura-teal text-white py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-8 mb-12">
            {/* Brand Section */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <img src="https://ngmwdebxyofxudrbesqs.supabase.co/storage/v1/object/public/nullstack//securaa.svg" alt="Secura" className="h-8 w-auto brightness-0 invert" style={{
                filter: 'brightness(0) saturate(100%) invert(82%) sepia(19%) saturate(1234%) hue-rotate(40deg) brightness(95%) contrast(88%)'
              }} />
              </div>
              <p className="text-secura-mint max-w-md">
                Secure document sharing platform designed specifically for the UAE real estate industry. 
                Compliant, encrypted, and trusted by leading agencies.
              </p>
              <div className="flex items-center space-x-4 pt-4">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-secura-lime" />
                  <span className="text-sm text-secura-mint">PDPL Compliant</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Lock className="h-4 w-4 text-secura-lime" />
                  <span className="text-sm text-secura-mint">Bank-Grade Security</span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-secura-lime">Contact</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-secura-lime" />
                  <a href="mailto:support@secura.me" className="text-secura-mint hover:text-white transition-colors">
                    support@secura.me
                  </a>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-secura-lime" />
                  <a href="tel:+97145551234" className="text-secura-mint hover:text-white transition-colors">
                    +971 4 555 1234
                  </a>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="h-4 w-4 text-secura-lime mt-1" />
                  <div className="text-secura-mint">
                    <p>Dubai Internet City</p>
                    <p>Dubai, UAE</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-secura-lime">Quick Links</h3>
              <div className="space-y-2">
                <Link to="/login" className="block text-secura-mint hover:text-white transition-colors">
                  Agency Portal
                </Link>
                <Link to="/support" className="block text-secura-mint hover:text-white transition-colors">
                  Support
                </Link>
                <Link to="/privacy" className="block text-secura-mint hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <Link to="/terms" className="block text-secura-mint hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-secura-moss pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-secura-mint">
                <p>&copy; 2025 Quri Technologies FZ-LLC. All rights reserved.</p>
                <p className="text-sm text-secura-mint/80 mt-1">Licensed in Dubai Internet City, United Arab Emirates</p>
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-secura-lime rounded-full"></div>
                  <span className="text-sm text-secura-mint">All systems operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>;
};

export default Index;
