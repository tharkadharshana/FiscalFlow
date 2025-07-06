
'use client';

import { useMemo } from 'react';
import type { Checklist, ChecklistItem } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { MoreVertical, Trash2, Save, Pencil } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from "../ui/progress";
import { useAppContext } from "@/contexts/app-context";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

type ChecklistCardProps = {
  checklist: Checklist;
  onEdit: () => void;
  onDelete: () => void;
  onSaveAsTemplate: () => void;
};

export function ChecklistCard({ checklist, onEdit, onDelete, onSaveAsTemplate }: ChecklistCardProps) {
  const { formatCurrency, updateChecklist } = useAppContext();

  const { completedItems, totalItems, totalCost } = useMemo(() => {
    const tItems = checklist.items.length;
    const cItems = checklist.items.filter(i => i.isCompleted).length;
    const tCost = checklist.items.reduce((sum, i) => sum + i.predictedCost, 0);
    return { completedItems: cItems, totalItems: tItems, totalCost: tCost };
  }, [checklist.items]);

  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  
  const handleItemToggle = (itemId: string, isCompleted: boolean) => {
    const updatedItems = checklist.items.map(item =>
      item.id === itemId ? { ...item, isCompleted } : item
    );
    updateChecklist(checklist.id, { items: updatedItems });
  };

  return (
    <Card className="flex flex-col">
        <Collapsible>
            <CollapsibleTrigger asChild>
                <div className="cursor-pointer">
                    <CardHeader className="flex flex-row items-start justify-between pb-4">
                        <div>
                            <CardTitle className="text-xl">{checklist.title}</CardTitle>
                            <CardDescription className="pt-1">{completedItems} / {totalItems} items completed</CardDescription>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={onEdit}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onSaveAsTemplate}>
                                    <Save className="mr-2 h-4 w-4" /> Save as Template
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Progress value={progress} />
                        <p className="text-sm text-muted-foreground text-right">
                            Total Predicted Cost: {formatCurrency(totalCost)}
                        </p>
                    </CardContent>
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <CardFooter className="flex-col items-start gap-2 pt-4 border-t">
                    <h4 className="font-semibold text-sm mb-2">Items</h4>
                    <div className="w-full space-y-3 max-h-48 overflow-y-auto pr-2">
                        {checklist.items.map(item => (
                            <div key={item.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        id={`item-${item.id}`}
                                        checked={item.isCompleted}
                                        onCheckedChange={(checked) => handleItemToggle(item.id, !!checked)}
                                    />
                                    <Label htmlFor={`item-${item.id}`} className={item.isCompleted ? 'line-through text-muted-foreground' : ''}>
                                        {item.description}
                                    </Label>
                                </div>
                                <span className="text-sm font-mono text-muted-foreground">{formatCurrency(item.predictedCost)}</span>
                            </div>
                        ))}
                    </div>
                </CardFooter>
            </CollapsibleContent>
        </Collapsible>
    </Card>
  );
}
