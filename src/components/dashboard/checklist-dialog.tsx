

'use client';

import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import { useAppContext } from '@/contexts/app-context';
import type { Checklist } from '@/types';
import { Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { nanoid } from 'nanoid';
import { allIcons } from '@/data/icons';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Label } from '../ui/label';

const checklistItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'Description is required.'),
  isCompleted: z.boolean(),
  predictedCost: z.coerce.number().min(0, 'Cost must be positive.'),
  category: z.string().min(1, 'Category is required.'),
});

const formSchema = z.object({
  title: z.string().min(2, 'Title is required.'),
  iconName: z.string().min(1, 'Icon is required.'),
  items: z.array(checklistItemSchema).min(1, 'Add at least one item.'),
});

type FormData = z.infer<typeof formSchema>;

type ChecklistDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklistToEdit?: Checklist | null;
};

export function ChecklistDialog({ open, onOpenChange, checklistToEdit }: ChecklistDialogProps) {
  const { addChecklist, updateChecklist, expenseCategories } = useAppContext();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      iconName: 'ShoppingCart',
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  useEffect(() => {
    if (open) {
      if (checklistToEdit) {
        form.reset(checklistToEdit);
      } else {
        form.reset({
          title: '',
          iconName: 'ShoppingCart',
          items: [{ id: nanoid(), description: '', isCompleted: false, predictedCost: 0, category: '' }],
        });
      }
    }
  }, [open, checklistToEdit, form]);

  async function onSubmit(values: FormData) {
    if (checklistToEdit) {
      await updateChecklist(checklistToEdit.id, values);
    } else {
      await addChecklist(values);
    }
    onOpenChange(false);
  }
  
  const IconPicker = ({ field }: { field: any }) => {
    const SelectedIcon = allIcons[field.value] || allIcons['ShoppingCart'];
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2">
                    <SelectedIcon /> {field.value}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 h-96">
                <ScrollArea className="h-full">
                    <div className="grid grid-cols-5 gap-1">
                        {Object.entries(allIcons).map(([name, Icon]) => (
                            <Button key={name} variant="ghost" size="icon" onClick={() => field.onChange(name)}>
                                <Icon />
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{checklistToEdit ? 'Edit' : 'Create'} Checklist</DialogTitle>
          <DialogDescription>
            Organize your planned expenses into a reusable checklist.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g. Monthly Bills" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="iconName" render={({ field }) => (
                <FormItem><FormLabel>Icon</FormLabel><IconPicker field={field} /><FormMessage /></FormItem>
              )} />
            </div>

            <div className="space-y-2">
                <Label>Items</Label>
                <ScrollArea className="h-64 pr-4">
                    <div className="space-y-3">
                        {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                                <FormField control={form.control} name={`items.${index}.description`} render={({ field }) => (
                                    <FormItem className="col-span-4"><FormLabel className="text-xs">Item</FormLabel><FormControl><Input placeholder="e.g., Rent" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name={`items.${index}.predictedCost`} render={({ field }) => (
                                    <FormItem className="col-span-3"><FormLabel className="text-xs">Cost</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name={`items.${index}.category`} render={({ field }) => (
                                    <FormItem className="col-span-4"><FormLabel className="text-xs">Category</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent><SelectContent>
                                                {expenseCategories.map(cat => (
                                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                ))}
                                            </SelectContent></SelectContent>
                                        </Select>
                                    <FormMessage /></FormItem>
                                )} />
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ id: nanoid(), description: '', isCompleted: false, predictedCost: 0, category: '' })}>
                    <Plus className="mr-2 h-4 w-4" />Add Item
                </Button>
            </div>
            
            <DialogFooter>
              <Button type="submit">{checklistToEdit ? 'Save Changes' : 'Create Checklist'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
