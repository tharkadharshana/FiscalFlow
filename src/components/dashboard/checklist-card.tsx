
'use client';

import { useAppContext } from '@/contexts/app-context';
import type { Checklist, ChecklistItem } from '@/types';
import { MoreVertical, Pencil, Trash2, Copy, Wallet, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Progress } from '../ui/progress';
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/lib/utils';
import { useState } from 'react';

type ChecklistCardProps = {
  checklist: Checklist;
  onEdit: () => void;
  onDelete: () => void;
  onSaveAsTemplate: () => void;
  onConvertToTransaction: (checklist: Checklist, item: ChecklistItem) => void;
};

export function ChecklistCard({
  checklist,
  onEdit,
  onDelete,
  onSaveAsTemplate,
  onConvertToTransaction,
}: ChecklistCardProps) {
  const { updateChecklist, formatCurrency } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);

  const completedItems = checklist.items.filter(item => item.isCompleted).length;
  const totalItems = checklist.items.length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const totalCost = checklist.items.reduce((sum, item) => sum + item.predictedCost, 0);

  const handleToggleItem = (itemId: string) => {
    const updatedItems = checklist.items.map(item =>
      item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
    );
    updateChecklist(checklist.id, { items: updatedItems });
  };

  return (
    <Card className="flex flex-col">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex-1 pr-4">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <div className="p-2 bg-muted rounded-md"><checklist.icon /></div>
                            {checklist.title}
                        </CardTitle>
                        <CardDescription className="mt-2">
                            {completedItems} of {totalItems} items completed
                        </CardDescription>
                    </div>
                    <div className="flex items-center">
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                            </Button>
                        </CollapsibleTrigger>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={onSaveAsTemplate}><Copy className="mr-2 h-4 w-4" /> Save as Template</DropdownMenuItem>
                                <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <Progress value={progress} className="mt-4" />
            </CardHeader>
            <CollapsibleContent>
                <CardContent className="flex-1 py-0">
                    <div className="divide-y">
                    {checklist.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between py-2 group">
                        <div className="flex items-center gap-3">
                            <Checkbox
                            id={`item-${item.id}`}
                            checked={item.isCompleted}
                            onCheckedChange={() => handleToggleItem(item.id)}
                            />
                            <label htmlFor={`item-${item.id}`} className={cn("text-sm", item.isCompleted && "line-through text-muted-foreground")}>
                            {item.description}
                            </label>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-muted-foreground">{formatCurrency(item.predictedCost)}</span>
                            <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => onConvertToTransaction(checklist, item)}
                            disabled={item.isCompleted}
                            >
                            <Wallet className="h-4 w-4 text-primary" />
                            </Button>
                        </div>
                        </div>
                    ))}
                    </div>
                </CardContent>
            </CollapsibleContent>
        </Collapsible>
      <CardFooter>
        <span className="text-sm font-medium">Total Predicted Cost: {formatCurrency(totalCost)}</span>
      </CardFooter>
    </Card>
  );
}
