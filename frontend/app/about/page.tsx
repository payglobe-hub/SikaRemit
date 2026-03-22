import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'About Us - SikaRemit',
  description: 'Learn about SikaRemit\'s mission to make remittances simple and affordable',
};

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">About SikaRemit</h1>
        
        <div className="grid gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                To make cross-border payments and remittances simple, affordable, and accessible for everyone in Africa and beyond.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Our Vision</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                To become the leading digital payment and remittance platform in Africa, connecting millions of people 
                with seamless financial services.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Secure</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Bank-level security and encryption to protect your money and data.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fast</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Instant transfers and real-time payment processing when you need it most.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Affordable</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Competitive rates and transparent fees with no hidden charges.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Our Story</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base">
              Founded in 2024, SikaRemit was born from the need to simplify remittances and payments across Africa. 
              We understand the challenges people face when sending money home and paying for services across borders. 
              Our platform is designed to make these transactions seamless, secure, and affordable for everyone.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
