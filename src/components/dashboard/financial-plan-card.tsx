'use client';

import type { FinancialPlan } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from "../ui/progress";

type FinancialPlanCardProps = {
  plan: FinancialPlan;
  onEdit: () => void;
  onDelete: () => void;
};

export function FinancialPlanCard({ plan, onEdit, onDelete }: FinancialPlanCardProps) {
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  const progress = plan.totalPredictedCost > 0 ? (plan.totalActualCost / plan.totalPredictedCost) * 100 : 0;
  const uniqueCategories = [...new Set(plan.items.map(item => item.category))];

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div>
          <CardTitle className="text-xl">{plan.title}</CardTitle>
          <CardDescription className="capitalize pt-1">{plan.status}...</CardDescription>
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
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="flex items-baseline justify-between font-mono">
            <div>
                <p className="text-sm text-muted-foreground">Actual</p>
                <span className="text-2xl font-bold">{formatCurrency(plan.totalActualCost)}</span>
            </div>
            <div className="text-right">
                <p className="text-sm text-muted-foreground">Predicted</p>
                <span className="text-lg text-muted-foreground">{formatCurrency(plan.totalPredictedCost)}</span>
            </div>
        </div>
        <Progress value={progress} />
      </CardContent>
      <CardFooter className="flex-col items-start gap-2">
         <p className="text-sm font-medium">Categories</p>
         <div className="flex flex-wrap gap-2">
            {uniqueCategories.slice(0, 4).map(category => (
                <Badge key={category} variant="outline">{category}</Badge>
            ))}
            {uniqueCategories.length > 4 && (
                <Badge variant="secondary">+{uniqueCategories.length - 4} more</Badge>
            )}
         </div>
      </CardFooter>
    </Card>
  );
}
