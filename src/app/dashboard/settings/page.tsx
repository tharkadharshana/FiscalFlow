
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/app-context';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Loader2, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { defaultExpenseCategories, defaultIncomeCategories } from '@/data/mock-data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const settingsSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters.'),
  currencyPreference: z.string(),
  darkModeBanner: z.boolean(),
  notificationPreferences: z.object({
    budgetThreshold: z.boolean(),
    recurringPayment: z.boolean(),
  }),
});

export default function SettingsPage() {
  const { userProfile, updateUserPreferences, loading, addCustomCategory, deleteCustomCategory, showNotification, isPremium } = useAppContext();
  const [newCategory, setNewCategory] = useState('');

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      displayName: '',
      currencyPreference: 'USD',
      darkModeBanner: false,
      notificationPreferences: {
        budgetThreshold: true,
        recurringPayment: true,
      },
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        displayName: userProfile.displayName || '',
        currencyPreference: userProfile.currencyPreference || 'USD',
        darkModeBanner: userProfile.darkModeBanner || false,
        notificationPreferences: {
          budgetThreshold: userProfile.notificationPreferences?.budgetThreshold ?? true,
          recurringPayment: userProfile.notificationPreferences?.recurringPayment ?? true,
        },
      });
    }
  }, [userProfile, form]);

  const onSubmit = async (data: z.infer<typeof settingsSchema>) => {
    await updateUserPreferences(data);
  };

  const handleAddCategory = () => {
    if (newCategory.trim() === '') {
        showNotification({ type: 'error', title: 'Category name cannot be empty.', description: '' });
        return;
    }
    addCustomCategory(newCategory.trim());
    setNewCategory('');
  }
  
  const CustomCategoryUI = (
      <Card>
          <CardHeader>
              <CardTitle>Manage Categories</CardTitle>
              <CardDescription>Add or remove your own custom categories for expenses and income.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div>
                  <Label className="text-xs text-muted-foreground">Custom Categories</Label>
                  <div className="flex flex-wrap gap-2 pt-2">
                  {userProfile?.customCategories && userProfile.customCategories.length > 0 ? (
                      userProfile.customCategories.map(cat => (
                          <Badge key={cat} variant="secondary" className="pl-3 pr-1">
                              {cat}
                              <Button variant="ghost" size="icon" className="h-5 w-5 ml-1" onClick={() => deleteCustomCategory(cat)}>
                                  <Trash2 className="h-3 w-3" />
                              </Button>
                          </Badge>
                      ))
                  ) : (
                      <p className="text-sm text-muted-foreground">No custom categories added yet.</p>
                  )}
                  </div>
              </div>
              <div className="flex gap-2">
                  <Input 
                      placeholder="New category name..."
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      disabled={!isPremium}
                  />
                  <Button type="button" onClick={handleAddCategory} disabled={!isPremium}>Add</Button>
              </div>
              <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Default Categories</Label>
                  <div className="flex flex-wrap gap-2 text-muted-foreground">
                      {[...defaultExpenseCategories, ...defaultIncomeCategories].map(cat => (
                          <Badge key={cat} variant="outline">{cat}</Badge>
                      ))}
                  </div>
              </div>
          </CardContent>
      </Card>
  );

  if (loading || !userProfile) {
    return (
        <div className="flex flex-1 flex-col">
            <Header title="Settings" />
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col">
        <Header title="Settings" />
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Manage your public profile information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={userProfile.profilePictureURL || undefined} data-ai-hint="profile avatar" />
                        <AvatarFallback>{userProfile.displayName?.[0].toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <Button variant="outline" type="button" disabled>Upload Picture</Button>
                </div>
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Customize the application to your liking.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="currencyPreference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                       <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                               <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isPremium}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a currency" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="USD">USD - United States Dollar</SelectItem>
                                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                                  <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                  <SelectItem value="LKR">LKR - Sri Lankan Rupee</SelectItem>
                                  <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TooltipTrigger>
                          {!isPremium && <TooltipContent><p>Upgrade to Premium to change currency.</p></TooltipContent>}
                        </Tooltip>
                      </TooltipProvider>

                      <FormDescription>This is the currency your transactions will be displayed in.</FormDescription>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="darkModeBanner"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel className="text-base">Dark Mode</FormLabel>
                            <FormDescription>Enable or disable the dark theme.</FormDescription>
                        </div>
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    {CustomCategoryUI}
                  </div>
                </TooltipTrigger>
                 {!isPremium && <TooltipContent><p>Upgrade to Premium to add custom categories.</p></TooltipContent>}
              </Tooltip>
            </TooltipProvider>

            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Manage how you receive notifications.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="notificationPreferences.budgetThreshold"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel className="text-base">Budget Alerts</FormLabel>
                            <FormDescription>Receive alerts when you're nearing a budget limit.</FormDescription>
                        </div>
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notificationPreferences.recurringPayment"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel className="text-base">Recurring Payments</FormLabel>
                            <FormDescription>Get reminders for upcoming recurring payments.</FormDescription>
                        </div>
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </main>
      </form>
    </Form>
  );
}
