

'use client';

import type { ChecklistTemplate } from '@/types';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { useAppContext } from '@/contexts/app-context';
import { Badge } from '../ui/badge';
import { Copy, List, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';

type ChecklistTemplateCardProps = {
  template: ChecklistTemplate;
  onDelete: () => void;
};

export function ChecklistTemplateCard({ template, onDelete }: ChecklistTemplateCardProps) {
    const { addChecklist } = useAppContext();

    const handleCreateFromTemplate = () => {
        addChecklist({
            title: template.title,
            iconName: template.iconName,
            items: template.items.map(item => ({ ...item, id: nanoid(), isCompleted: false })),
        });
    }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-md"><template.icon /></div>
          <CardTitle>{template.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex flex-wrap gap-2">
            {template.items.slice(0, 5).map(item => (
                <Badge key={item.id} variant="outline">{item.description}</Badge>
            ))}
            {template.items.length > 5 && <Badge variant="secondary">+{template.items.length - 5} more</Badge>}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={handleCreateFromTemplate}><Copy className="mr-2 h-4 w-4" /> Use Template</Button>
        <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </CardFooter>
    </Card>
  );
}
