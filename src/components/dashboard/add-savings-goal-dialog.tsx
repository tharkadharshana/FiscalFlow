
'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAppContext } from '@/contexts/app-context';
import type { SavingsGoal } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { Switch } from '../ui/switch';


const formSchema = z.object({
  title: z.string().min(3, 'Goal title must be at least 3 characters.'),
  targetAmount: z.coerce.number().min(1, 'Target amount must be greater than 0.'),
  deadline: z.date().optional(),
  isRoundupGoal: z.boolean().default(false),
});

type AddSavingsGoalDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalToEdit?: SavingsGoal | null;
};

export function AddSavingsGoalDialog({ open, onOpenChange, goalToEdit }: AddSavingsGoalDialogProps) {
  const { addSavingsGoal, updateSavingsGoal, savingsGoals, showNotification } = useAppContext();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      targetAmount: 0,
      deadline: undefined,
      isRoundupGoal: false,
    },
  });
  
  useEffect(() => {
    if (goalToEdit) {
      form.reset({
        title: goalToEdit.title,
        targetAmount: goalToEdit.targetAmount,
        deadline: goalToEdit.deadline ? parseISO(goalToEdit.deadline) : undefined,
        isRoundupGoal: goalToEdit.isRoundupGoal || false,
      });
    } else {
      form.reset({
        title: '',
        targetAmount: 0,
        deadline: undefined,
        isRoundupGoal: false,
      });
    }
  }, [goalToEdit, form, open]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    const dataToSave = {
        ...values,
        deadline: values.deadline?.toISOString(),
    }

    // Ensure only one roundup goal can be active
    const existingRoundupGoal = savingsGoals.find(g => g.isRoundupGoal && g.id !== goalToEdit?.id);
    if (values.isRoundupGoal && existingRoundupGoal) {
        showNotification({
            type: "error",
            title: "Round-up Goal Exists",
            description: `"${existingRoundupGoal.title}" is already your active round-up goal. Please disable it first if you want to assign a new one.`
        });
        return;
    }

    if (goalToEdit) {
      await updateSavingsGoal(goalToEdit.id, dataToSave);
    } else {
      await addSavingsGoal(dataToSave);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{goalToEdit ? 'Edit' : 'Create'} Savings Goal</DialogTitle>
          <DialogDescription>
            Set a target and a deadline to motivate your savings.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Goal Title</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. Vacation to Hawaii" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="targetAmount"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Target Amount</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="1000" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Deadline (Optional)</FormLabel>
                            <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                    )}
                                >
                                    {field.value ? (
                                    format(field.value, "PPP")
                                    ) : (
                                    <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
                                initialFocus
                                />
                            </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <FormField
                  control={form.control}
                  name="isRoundupGoal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel className="text-base">Micro-Savings Goal</FormLabel>
                            <FormDescription>Automatically save spare change from your expenses towards this goal. Only one goal can be active at a time.</FormDescription>
                        </div>
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                    </FormItem>
                  )}
                />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {goalToEdit ? 'Save Changes' : 'Create Goal'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
