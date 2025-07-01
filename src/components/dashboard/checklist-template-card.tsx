
'use client';

import { useState } from 'react';
import type { ChecklistTemplate } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Trash2 } from "lucide-react";
import { useAppContext } from "@/contexts/app-context";
import { ChecklistDialog } from './checklist-dialog';

type ChecklistTemplateCardProps = {
  template: ChecklistTemplate;
  onDelete: () => void;
};

export function ChecklistTemplateCard({ template, onDelete }: ChecklistTemplateCardProps) {
    const { formatCurrency } = useAppContext();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const totalCost = template.items.reduce((sum, i) => sum + i.predictedCost, 0);

    return (
        <>
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle>{template.title}</CardTitle>
                    <CardDescription>{template.items.length} items</CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total: {formatCurrency(totalCost)}</span>
                    <div className="flex gap-2">
                        <Button onClick={() => setIsDialogOpen(true)} size="sm">Use Template</Button>
                        <Button onClick={onDelete} variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </CardFooter>
            </Card>
            <ChecklistDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} template={template} />
        </>
    );
}
