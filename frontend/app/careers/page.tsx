import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Careers - SikaRemit',
  description: 'Join our team and help shape the future of remittances in Africa',
};

export default function CareersPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">Careers at SikaRemit</h1>
        
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-xl">Join Our Mission</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base">
              We're looking for talented individuals who are passionate about transforming financial services in Africa. 
              Join us in building the future of remittances and digital payments.
            </CardDescription>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Why Work With Us?</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li>• Make a real impact on millions of lives</li>
                <li>• Work with a talented, diverse team</li>
                <li>• Competitive compensation and benefits</li>
                <li>• Flexible work environment</li>
                <li>• Opportunities for growth and development</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Our Values</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li>• Customer-first approach</li>
                <li>• Innovation and creativity</li>
                <li>• Integrity and transparency</li>
                <li>• Collaboration and teamwork</li>
                <li>• Continuous learning</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Current Openings</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              We're always looking for talented individuals to join our team. While we may not have specific 
              positions listed right now, we'd love to hear from you if you're interested in:
            </CardDescription>
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Engineering</h4>
                <ul className="text-sm space-y-1">
                  <li>• Full-stack Developers</li>
                  <li>• Mobile Developers</li>
                  <li>• DevOps Engineers</li>
                  <li>• QA Engineers</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Business & Operations</h4>
                <ul className="text-sm space-y-1">
                  <li>• Product Managers</li>
                  <li>• Marketing Specialists</li>
                  <li>• Customer Support</li>
                  <li>• Compliance Officers</li>
                </ul>
              </div>
            </div>
            <div className="mt-6">
              <p className="text-sm">
                <strong>To apply:</strong> Send your resume and cover letter to careers@sikaremit.com
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
