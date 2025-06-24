
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowLeft, Mail, Phone, MessageCircle, FileText, Users, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Support = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    category: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate form submission
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Support Request Submitted",
        description: "We'll get back to you within 24 hours.",
      });
      setFormData({
        name: '',
        email: '',
        company: '',
        category: '',
        subject: '',
        message: ''
      });
    }, 1000);
  };

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

      {/* Hero Section */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl secura-gradient flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-secura-black mb-4">
            Support Center
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Need help with Secura? We're here to assist you with any questions or technical issues.
          </p>
        </div>
      </section>

      {/* Quick Help Section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-secura-black text-center mb-12">
            How can we help you?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="border-2 hover:border-secura-lime transition-colors cursor-pointer">
              <CardHeader className="text-center">
                <div className="w-12 h-12 rounded-xl bg-secura-lime/10 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-secura-teal" />
                </div>
                <CardTitle className="text-lg text-secura-black">Documentation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Browse our comprehensive guides and tutorials to get the most out of Secura.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-secura-lime transition-colors cursor-pointer">
              <CardHeader className="text-center">
                <div className="w-12 h-12 rounded-xl bg-secura-mint/20 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-secura-moss" />
                </div>
                <CardTitle className="text-lg text-secura-black">Live Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Chat with our support team for immediate assistance with your questions.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-secura-lime transition-colors cursor-pointer">
              <CardHeader className="text-center">
                <div className="w-12 h-12 rounded-xl bg-secura-teal/10 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-secura-teal" />
                </div>
                <CardTitle className="text-lg text-secura-black">Status Page</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Check the current status of all Secura services and planned maintenance.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h3 className="text-2xl font-bold text-secura-black mb-6">
                Submit a Support Request
              </h3>
              <Card className="shadow-lg border-2 border-gray-100">
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-secura-black font-medium">
                          Full Name *
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Your full name"
                          required
                          className="border-2 focus:border-secura-teal"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-secura-black font-medium">
                          Email Address *
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="your@email.com"
                          required
                          className="border-2 focus:border-secura-teal"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-secura-black font-medium">
                        Company/Agency Name
                      </Label>
                      <Input
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        placeholder="Your company name"
                        className="border-2 focus:border-secura-teal"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-secura-black font-medium">
                        Category *
                      </Label>
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border-2 border-input bg-background rounded-md focus:border-secura-teal focus:outline-none"
                      >
                        <option value="">Select a category</option>
                        <option value="technical">Technical Issue</option>
                        <option value="billing">Billing & Account</option>
                        <option value="feature">Feature Request</option>
                        <option value="security">Security Concern</option>
                        <option value="general">General Question</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-secura-black font-medium">
                        Subject *
                      </Label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        placeholder="Brief description of your issue"
                        required
                        className="border-2 focus:border-secura-teal"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-secura-black font-medium">
                        Message *
                      </Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        placeholder="Please provide detailed information about your request..."
                        required
                        rows={6}
                        className="border-2 focus:border-secura-teal"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-secura-lime hover:bg-secura-lime/90 text-secura-teal font-semibold text-lg rounded-xl transition-all duration-300 hover:scale-105"
                    >
                      {loading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-secura-teal"></div>
                          <span>Submitting...</span>
                        </div>
                      ) : (
                        'Submit Request'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-secura-black mb-6">
                  Contact Information
                </h3>
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-secura-lime/10 flex items-center justify-center">
                      <Mail className="w-6 h-6 text-secura-teal" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-secura-black mb-1">Email Support</h4>
                      <p className="text-muted-foreground mb-2">Get help via email</p>
                      <a href="mailto:support@secura.me" className="text-secura-teal hover:text-secura-moss">
                        support@secura.me
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-secura-mint/20 flex items-center justify-center">
                      <Phone className="w-6 h-6 text-secura-moss" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-secura-black mb-1">Phone Support</h4>
                      <p className="text-muted-foreground mb-2">Call us for urgent matters</p>
                      <a href="tel:+97145551234" className="text-secura-teal hover:text-secura-moss">
                        +971 4 555 1234
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-secura-teal/10 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-secura-teal" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-secura-black mb-1">Business Hours</h4>
                      <p className="text-muted-foreground">
                        Sunday - Thursday: 9:00 AM - 6:00 PM GST<br />
                        Friday - Saturday: Closed
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Card className="border-2 border-secura-lime/20 bg-secura-lime/5">
                <CardHeader>
                  <CardTitle className="text-lg text-secura-black flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-secura-teal" />
                    <span>Priority Support</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Enterprise customers receive priority support with guaranteed response times. 
                    Contact your account manager for assistance.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Support;
