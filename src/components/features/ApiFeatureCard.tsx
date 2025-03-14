import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ApiFeatureCardProps {
  title: string;
  description: string;
  features: string[];
}

export function ApiFeatureCard({ title, description, features }: ApiFeatureCardProps) {
  return (
    <div className="feature-card">
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
      <ul className="feature-list">
        {features.map((feature, index) => (
          <li key={index} className="feature-list-item">
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
