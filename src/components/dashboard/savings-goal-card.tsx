
'use client';

import type { SavingsGoal, Badge as BadgeType } from "@/types";
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
import { MoreVertical, Pencil, Trash2, Trophy, Award, Star, CalendarDays, Repeat } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from "../ui/progress";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { useAppContext } from "@/contexts/app-context";

type SavingsGoalCardProps = {
  goal: SavingsGoal;
  onEdit: () => void;
  onDelete: () => void;
};

const badgeIcons: Record<BadgeType['name'], React.ReactNode> = {
    'First Saving': <Star className="h-4 w-4 text-yellow-400" />,
    '25% Mark': <Star className="h-4 w-4 text-lime-500" />,
    '50% Mark': <Award className="h-4 w-4 text-orange-500" />,
    '75% Mark': <Award className="h-4 w-4 text-sky-500" />,
    'Goal Achieved!': <Trophy className="h-4 w-4 text-amber-500" />,
};

export function SavingsGoalCard({ goal, onEdit, onDelete }: SavingsGoalCardProps) {
  const { formatCurrency } = useAppContext();
  
  const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div>
          <CardTitle className="text-xl">{goal.title}</CardTitle>
          {goal.deadline && (
              <CardDescription className="flex items-center gap-2 pt-1">
                <CalendarDays className="h-4 w-4" />
                Due in {formatDistanceToNow(parseISO(goal.deadline), { addSuffix: true })}
              </CardDescription>
          )}
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
                <p className="text-sm text-muted-foreground">Saved</p>
                <span className="text-2xl font-bold">{formatCurrency(goal.currentAmount)}</span>
            </div>
            <div className="text-right">
                <p className="text-sm text-muted-foreground">Goal</p>
                <span className="text-lg text-muted-foreground">{formatCurrency(goal.targetAmount)}</span>
            </div>
        </div>
        <Progress value={progress} />
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-3">
         <div className="flex flex-wrap gap-2">
            {goal.isRoundupGoal && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                    <Repeat className="mr-1 h-3 w-3" />
                    Round-up Goal
                </Badge>
            )}
            {goal.badges.map(badge => (
                <TooltipProvider key={badge.name}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge variant="outline" className="gap-1 pl-2">
                                {badgeIcons[badge.name]}
                                {badge.name}
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Achieved on {format(parseISO(badge.dateAchieved), "MMM d, yyyy")}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ))}
         </div>
      </CardFooter>
    </Card>
  );
}
