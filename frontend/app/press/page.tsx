import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Press - SikaRemit',
  description: 'Press releases, media kit, and company information for journalists and partners',
};

export default function PressPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">Press & Media</h1>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Media Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-lg">
              Welcome to the SikaRemit press room. Here you'll find our latest press releases, company information, 
              and media resources for journalists and partners.
            </CardDescription>
          </CardContent>
        </Card>

        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Latest Press Release</CardTitle>
              <CardDescription>March 2024</CardDescription>
            </CardHeader>
            <CardContent>
              <CardDescription>
                <strong>SikaRemit Launches Revolutionary Remittance Platform for African Markets</strong><br/>
                Accra, Ghana - SikaRemit today announced the launch of its innovative digital remittance platform 
                designed to make cross-border payments simpler, faster, and more affordable for millions across Africa.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Company Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                SikaRemit is a fintech company dedicated to transforming remittances and digital payments in Africa. 
                Founded in 2024, we leverage cutting-edge technology to provide secure, affordable, and convenient 
                financial services to individuals and businesses across the continent.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Media Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                <strong>Press Inquiries:</strong><br/>
                Email: press@sikaremit.com<br/>
                Phone: +233 XXX XXX XXX<br/>
                Response time: Within 24 hours
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Download Media Kit</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Our media kit includes:
                <ul className="mt-2 space-y-1">
                  <li>• Company logo and brand guidelines</li>
                  <li>• Executive photos and bios</li>
                  <li>• Product screenshots</li>
                  <li>• Company fact sheet</li>
                </ul>
                <p className="mt-2 text-sm">
                  <strong>Coming Soon:</strong> Media kit download
                </p>
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Key Talking Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Mission & Vision</h4>
                <ul className="text-sm space-y-1">
                  <li>• Making remittances accessible across Africa</li>
                  <li>• Reducing costs for cross-border payments</li>
                  <li>• Leveraging technology for financial inclusion</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Key Features</h4>
                <ul className="text-sm space-y-1">
                  <li>• Multi-country support</li>
                  <li>• Real-time exchange rates</li>
                  <li>• Bank-level security</li>
                  <li>• Mobile-first design</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
