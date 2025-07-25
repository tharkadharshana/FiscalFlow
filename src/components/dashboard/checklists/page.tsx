

'use client';

import { useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/app-context';
import { PlusCircle, ListTodo, ClipboardPaste } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { Checklist, ChecklistItem, ChecklistTemplate } from '@/types';
import { ChecklistCard } from '@/components/dashboard/checklist-card';
import { ChecklistTemplateCard } from '@/components/dashboard/checklist-template-card';
import { ChecklistDialog } from '@/components/dashboard/checklist-dialog';
import { AddTransactionDialog } from '../add-transaction-dialog';

export default function ChecklistsPage() {
  const { checklists, deleteChecklist, createTemplateFromChecklist, checklistTemplates, deleteChecklistTemplate } = useAppContext();
  
  const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);
  const [isAddTxDialogOpen, setIsAddTxDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [checklistToEdit, setChecklistToEdit] = useState<Checklist | null>(null);
  const [itemToConvert, setItemToConvert] = useState<{ checklistId: string; item: ChecklistItem } | null>(null);
  const [checklistToDelete, setChecklistToDelete] = useState<Checklist | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<ChecklistTemplate | null>(null);

  const handleEditChecklist = (checklist: Checklist) => {
    setChecklistToEdit(checklist);
    setIsChecklistDialogOpen(true);
  };

  const handleDeleteChecklist = (checklist: Checklist) => {
    setChecklistToDelete(checklist);
    setTemplateToDelete(null);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteTemplate = (template: ChecklistTemplate) => {
    setTemplateToDelete(template);
    setChecklistToDelete(null);
    setIsDeleteDialogOpen(true);
  };

  const handleConvertToTransaction = (checklist: Checklist, item: ChecklistItem) => {
    setItemToConvert({ checklistId: checklist.id, item });
    setIsAddTxDialogOpen(true);
  };

  const handleChecklistDialogClose = (open: boolean) => {
    if (!open) {
      setChecklistToEdit(null);
    }
    setIsChecklistDialogOpen(open);
  };

  const handleAddTxDialogClose = (open: boolean) => {
    if (!open) {
      setItemToConvert(null);
    }
    setIsAddTxDialogOpen(open);
  }

  const confirmDelete = async () => {
    if (checklistToDelete) {
      await deleteChecklist(checklistToDelete.id);
    }
    if (templateToDelete) {
      await deleteChecklistTemplate(templateToDelete.id);
    }
    setIsDeleteDialogOpen(false);
    setChecklistToDelete(null);
    setTemplateToDelete(null);
  };

  return (
    <>
      <div className="flex flex-1 flex-col">
        <Header title="Financial Checklists" />
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <Tabs defaultValue="checklists">
            <div className='flex justify-between items-center mb-4'>
                <TabsList>
                    <TabsTrigger value="checklists">My Checklists</TabsTrigger>
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                </TabsList>
                <Button onClick={() => setIsChecklistDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Checklist
                </Button>
            </div>
            
            <TabsContent value="checklists">
              <Card>
                <CardHeader>
                    <CardTitle>Your Checklists</CardTitle>
                    <CardDescription>Manage your spending to-do lists. Click a card to expand and check off items.</CardDescription>
                </CardHeader>
                <CardContent>
                    {checklists.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                            {checklists.map((checklist) => (
                                <ChecklistCard 
                                    key={checklist.id}
                                    checklist={checklist}
                                    onEdit={() => handleEditChecklist(checklist)}
                                    onDelete={() => handleDeleteChecklist(checklist)}
                                    onSaveAsTemplate={() => createTemplateFromChecklist(checklist)}
                                    onConvertToTransaction={handleConvertToTransaction}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="py-16 text-center text-muted-foreground flex flex-col items-center">
                            <ListTodo className="h-12 w-12 mb-4" />
                            <p className="text-lg font-semibold">No checklists yet.</p>
                            <p>Click "New Checklist" to plan your upcoming expenses.</p>
                        </div>
                    )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates">
              <Card>
                <CardHeader>
                    <CardTitle>Your Templates</CardTitle>
                    <CardDescription>Reuse common checklist items to save time.</CardDescription>
                </CardHeader>
                <CardContent>
                    {checklistTemplates.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                            {checklistTemplates.map((template) => (
                                <ChecklistTemplateCard
                                    key={template.id}
                                    template={template}
                                    onDelete={() => handleDeleteTemplate(template)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="py-16 text-center text-muted-foreground flex flex-col items-center">
                            <ClipboardPaste className="h-12 w-12 mb-4" />
                            <p className="text-lg font-semibold">No templates saved.</p>
                            <p>Create a checklist and save it as a template for future use.</p>
                        </div>
                    )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      
      <ChecklistDialog 
        open={isChecklistDialogOpen} 
        onOpenChange={handleChecklistDialogClose}
        checklistToEdit={checklistToEdit}
      />

      <AddTransactionDialog
        open={isAddTxDialogOpen}
        onOpenChange={handleAddTxDialogClose}
        itemToConvert={itemToConvert}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete "{checklistToDelete?.title || templateToDelete?.title}".
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                Delete
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
