
'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAppContext } from '@/contexts/app-context';
import { ScrollArea } from '../ui/scroll-area';
import { nanoid } from 'nanoid';
import { Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { ChecklistTemplate } from '@/types';

const itemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, "Description is required."),
  predictedCost: z.coerce.number().min(0, "Cost must be a positive number."),
  isCompleted: z.boolean(),
});

const formSchema = z.object({
  title: z.string().min(2, 'Title is required.'),
  items: z.array(itemSchema),
});

type ChecklistDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: ChecklistTemplate | null;
};

export function ChecklistDialog({ open, onOpenChange, template }: ChecklistDialogProps) {
  const { addChecklist, checklistTemplates } = useAppContext();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      items: [],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  });

  useEffect(() => {
    if (open) {
      if (template) {
        form.reset({
          title: template.title.replace('Template', '').trim(),
          items: template.items.map(item => ({ ...item, id: nanoid(), isCompleted: false }))
        });
      } else {
        form.reset({
          title: '',
          items: [{ id: nanoid(), description: '', predictedCost: 0, isCompleted: false }]
        });
      }
    }
  }, [open, template, form]);
  
  const handleTemplateChange = (templateId: string) => {
    const selectedTemplate = checklistTemplates.find(t => t.id === templateId);
    if (selectedTemplate) {
        form.setValue('title', selectedTemplate.title.replace('Template', '').trim());
        form.setValue('items', selectedTemplate.items.map(item => ({ ...item, id: nanoid(), isCompleted: false })));
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await addChecklist(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Financial Checklist</DialogTitle>
          <DialogDescription>
            Plan your spending by creating a list of items. You can start from scratch or use a template.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!template && (
                <div className="space-y-2">
                    <Label>Start from a template (Optional)</Label>
                    <Select onValueChange={handleTemplateChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                        <SelectContent>
                        {checklistTemplates.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Checklist Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Monthly Shopping, Vacation Prep" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <Label>Items</Label>
              <ScrollArea className="max-h-60 w-full pr-4 mt-2">
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.description`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="Item description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.predictedCost`}
                        render={({ field }) => (
                          <FormItem className="w-28">
                            <FormControl>
                              <Input type="number" placeholder="Cost" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ id: nanoid(), description: '', predictedCost: 0, isCompleted: false })}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Create Checklist
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
