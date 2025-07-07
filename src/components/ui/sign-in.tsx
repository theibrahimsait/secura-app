import React, { useState } from 'react';
import { Eye, EyeOff, Mail } from 'lucide-react';
import { FloatingPanelRoot, FloatingPanelTrigger, FloatingPanelContent, FloatingPanelBody, FloatingPanelFooter, FloatingPanelButton } from '@/components/ui/floating-panel';

// --- HELPER COMPONENTS (ICONS) ---

const GoogleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
    </svg>;

// --- TYPE DEFINITIONS ---

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}
interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  testimonials?: Testimonial[];
  onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
  onGoogleSignIn?: () => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
  loading?: boolean;
}

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({
  children
}: {
  children: React.ReactNode;
}) => <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-secura-teal/70 focus-within:bg-secura-teal/10">
    {children}
  </div>;
const TestimonialCard = ({
  testimonial,
  delay
}: {
  testimonial: Testimonial;
  delay: string;
}) => <div className={`animate-testimonial ${delay} flex items-start gap-3 rounded-3xl bg-card/40 dark:bg-zinc-800/40 backdrop-blur-xl border border-white/10 p-5 w-64`}>
    <img src={testimonial.avatarSrc} className="h-10 w-10 object-cover rounded-2xl" alt="avatar" />
    <div className="text-sm leading-snug">
      <p className="flex items-center gap-1 font-medium">{testimonial.name}</p>
      <p className="text-muted-foreground">{testimonial.handle}</p>
      <p className="mt-1 text-foreground/80">{testimonial.text}</p>
    </div>
  </div>;

// --- MAIN COMPONENT ---

export const SignInPage: React.FC<SignInPageProps> = ({
  title = <span className="font-light text-foreground tracking-tighter">Welcome</span>,
  description = "Access your account and continue your journey with us",
  heroImageSrc,
  testimonials = [],
  onSignIn,
  onGoogleSignIn,
  onResetPassword,
  onCreateAccount,
  loading = false
}) => {
  const [showPassword, setShowPassword] = useState(false);
  return <div className="min-h-screen flex flex-col lg:flex-row font-geist bg-transparent">
      {/* Left column: sign-in form */}
      <section className="flex-1 flex items-center justify-center p-8 bg-transparent">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
          <div className="flex flex-col gap-6">
            <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight text-left">{title}</h1>
            <p className="animate-element animate-delay-200 text-muted-foreground">{description}</p>

            <form className="space-y-5" onSubmit={onSignIn}>
              <div className="animate-element animate-delay-300">
                <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                <GlassInputWrapper>
                  <input name="email" type="email" placeholder="Enter your email address" className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none" />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-400">
                <label className="text-sm font-medium text-muted-foreground">Password</label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center">
                      {showPassword ? <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" /> : <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="rememberMe" className="custom-checkbox" />
                  <span className="text-foreground/90">Keep me signed in</span>
                </label>
                <FloatingPanelRoot>
                  <FloatingPanelTrigger
                    title="Reset Password"
                    className="bg-transparent border-none p-0 h-auto hover:underline text-secura-teal transition-colors text-sm font-normal"
                  >
                    Reset password
                  </FloatingPanelTrigger>
                  <FloatingPanelContent className="w-80">
                    <FloatingPanelBody>
                      <div className="flex items-center gap-3 mb-4">
                        <Mail className="w-5 h-5 text-secura-teal" />
                        <h3 className="font-semibold text-foreground">Password Reset Request</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Due to security reasons, for any password reset requests please send an email from your registered admin email to:
                      </p>
                      <div className="bg-secura-teal/10 rounded-lg p-3 mb-4">
                        <p className="text-sm font-medium text-secura-teal">support@secura.me</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Make sure to send the request from your registered email address for verification purposes.
                      </p>
                    </FloatingPanelBody>
                    <FloatingPanelFooter>
                      <div></div>
                      <FloatingPanelButton className="bg-secura-lime hover:bg-secura-lime/90 text-secura-teal font-medium px-6 py-2 rounded-lg">
                        Done
                      </FloatingPanelButton>
                    </FloatingPanelFooter>
                  </FloatingPanelContent>
                </FloatingPanelRoot>
              </div>

              <button type="submit" disabled={loading} className="animate-element animate-delay-600 w-full rounded-2xl py-4 font-medium transition-colors bg-lime-400 hover:bg-lime-300 text-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-950"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="animate-element animate-delay-700 relative flex items-center justify-center bg-transparent">
              <span className="w-full border-t border-border"></span>
              <span className="px-4 text-sm text-muted-foreground bg-white/80 absolute rounded">Or</span>
            </div>

            {onGoogleSignIn && <button onClick={onGoogleSignIn} className="animate-element animate-delay-800 w-full flex items-center justify-center gap-3 border border-border rounded-2xl py-4 hover:bg-secondary transition-colors">
                  <GoogleIcon />
                  Continue with Google
              </button>}

            <p className="animate-element animate-delay-900 text-center text-sm text-muted-foreground bg-transparent">
              New to our platform? 
              <FloatingPanelRoot>
                <FloatingPanelTrigger
                  title="Create Account"
                  className="bg-transparent border-none p-0 h-auto hover:underline text-secura-teal transition-colors text-sm font-normal ml-1"
                >
                  Create Account
                </FloatingPanelTrigger>
                <FloatingPanelContent className="w-80">
                  <FloatingPanelBody>
                    <div className="flex items-center gap-3 mb-4">
                      <Mail className="w-5 h-5 text-secura-teal" />
                      <h3 className="font-semibold text-foreground">New Agency Registration</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      To register your agency on Secura, please contact us at:
                    </p>
                    <div className="bg-secura-teal/10 rounded-lg p-3 mb-4">
                      <p className="text-sm font-medium text-secura-teal">hi@secura.me</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Our team will guide you through the onboarding process and set up your agency account.
                    </p>
                  </FloatingPanelBody>
                  <FloatingPanelFooter>
                    <div></div>
                    <FloatingPanelButton className="bg-secura-lime hover:bg-secura-lime/90 text-secura-teal font-medium px-6 py-2 rounded-lg">
                      Done
                    </FloatingPanelButton>
                  </FloatingPanelFooter>
                </FloatingPanelContent>
              </FloatingPanelRoot>
            </p>
          </div>
        </div>
      </section>

      {/* Right column: hero image + testimonials */}
      {heroImageSrc && <section className="hidden lg:block flex-1 relative p-4">
          <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-left" style={{
        backgroundImage: `url(${heroImageSrc})`
      }}></div>
          {testimonials.length > 0 && <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full justify-center">
              <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
              {testimonials[1] && <div className="hidden xl:flex"><TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" /></div>}
              {testimonials[2] && <div className="hidden 2xl:flex"><TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1400" /></div>}
            </div>}
        </section>}
    </div>;
};