
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
import { useAppContext, FREE_TIER_LIMITS } from '@/contexts/app-context';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Loader2, Trash2, Sparkles, Star, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { defaultExpenseCategories, defaultIncomeCategories } from '@/data/mock-data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { countries } from '@/data/countries';
import { GmailConnect } from '@/components/dashboard/settings/gmail-connect';
import { useTranslation } from '@/contexts/translation-context';

const settingsSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters.'),
  countryCode: z.string(),
  currencyPreference: z.string(),
  languagePreference: z.enum(['en', 'si', 'ta']),
  financialCycleStartDay: z.coerce.number().min(1, "Day must be at least 1.").max(31, "Day must be at most 31."),
  darkModeBanner: z.boolean(),
  showOnboardingOnLogin: z.boolean(),
  notificationPreferences: z.object({
    budgetThreshold: z.boolean(),
    recurringPayment: z.boolean(),
  }),
});

export default function SettingsPage() {
  const { userProfile, updateUserPreferences, loading, addCustomCategory, deleteCustomCategory, showNotification, isPremium } = useAppContext();
  const { t } = useTranslation();
  const [newCategory, setNewCategory] = useState('');

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      displayName: '',
      countryCode: 'US',
      currencyPreference: 'USD',
      languagePreference: 'en',
      financialCycleStartDay: 1,
      darkModeBanner: false,
      showOnboardingOnLogin: true,
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
        countryCode: userProfile.countryCode || 'US',
        currencyPreference: userProfile.currencyPreference || 'USD',
        languagePreference: userProfile.languagePreference || 'en',
        financialCycleStartDay: userProfile.financialCycleStartDay || 1,
        darkModeBanner: userProfile.darkModeBanner || false,
        showOnboardingOnLogin: userProfile.showOnboardingOnLogin ?? true,
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

  const canAddCategory = isPremium || (userProfile?.customCategories?.length || 0) < FREE_TIER_LIMITS.customCategories;

  const AddCategoryButton = (
    <Button type="button" onClick={handleAddCategory} disabled={!canAddCategory}>{t('settings.categories.addButton')}</Button>
  );
  
  const CustomCategoryUI = (
      <Card>
          <CardHeader>
              <CardTitle>{t('settings.categories.title')}</CardTitle>
              <CardDescription>{t('settings.categories.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div>
                  <Label className="text-xs text-muted-foreground">{t('settings.categories.customLabel')}</Label>
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
                      <p className="text-sm text-muted-foreground">{t('settings.categories.noCustom')}</p>
                  )}
                  </div>
              </div>
              <div className="flex gap-2">
                  <Input 
                      placeholder={t('settings.categories.placeholder')}
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      disabled={!canAddCategory}
                  />
                  {canAddCategory ? AddCategoryButton : (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild><div>{AddCategoryButton}</div></TooltipTrigger>
                            <TooltipContent>
                                <p>{t('settings.categories.limitTooltip')}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                  )}
              </div>
              <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t('settings.categories.defaultLabel')}</Label>
                  <div className="flex flex-wrap gap-2 text-muted-foreground">
                      {[...defaultExpenseCategories, ...defaultIncomeCategories].map(cat => (
                          <Badge key={cat} variant="outline">{cat}</Badge>
                      ))}
                  </div>
              </div>
          </CardContent>
      </Card>
  );

  const SubscriptionCard = (
    <Card>
        <CardHeader>
            <CardTitle>{t('settings.subscription.title')}</CardTitle>
            <CardDescription>{t('settings.subscription.description')}</CardDescription>
        </CardHeader>
        <CardContent>
            {isPremium ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                        <Star className="h-8 w-8 text-amber-500" />
                        <div>
                            <p className="font-semibold">{t('settings.subscription.premium.title')}</p>
                            <p className="text-sm text-muted-foreground">
                                {userProfile?.subscription?.expiryDate 
                                    ? t('settings.subscription.premium.validUntil', { date: new Date(userProfile.subscription.expiryDate).toLocaleDateString() })
                                    : t('settings.subscription.premium.allFeatures')}
                            </p>
                        </div>
                    </div>
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/dashboard/upgrade">{t('settings.subscription.premium.manageButton')}</Link>
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-muted-foreground">{t('settings.subscription.free.title')}</p>
                    <Button asChild className="w-full bg-gradient-to-r from-primary to-blue-600 text-white hover:opacity-90">
                        <Link href="/dashboard/upgrade">
                            <Sparkles className="mr-2 h-4 w-4" />
                            {t('settings.subscription.free.upgradeButton')}
                        </Link>
                    </Button>
                </div>
            )}
        </CardContent>
    </Card>
  );

  if (loading && !userProfile) {
    return (
        <div className="flex flex-1 flex-col">
            <Header title={t('settings.pageTitle')} />
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
        <div className="flex flex-1 flex-col">
            <Header title={t('settings.pageTitle')} />
            <div className="flex flex-1 items-center justify-center text-center p-4">
                <div>
                    <p className="text-lg font-semibold text-destructive">{t('settings.errors.profileLoadFailed')}</p>
                    <p className="text-muted-foreground">{t('settings.errors.profileLoadDesc')}</p>
                </div>
            </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col">
        <Header title={t('settings.pageTitle')} />
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.profile.title')}</CardTitle>
                <CardDescription>{t('settings.profile.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={userProfile.profilePictureURL || undefined} data-ai-hint="profile avatar" />
                        <AvatarFallback>{userProfile.displayName?.[0].toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" type="button" disabled>{t('settings.profile.uploadButton')}</Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('settings.profile.comingSoon')}</p>
                      </TooltipContent>
                    </Tooltip>
                </div>
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings.profile.nameLabel')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('settings.profile.namePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            {SubscriptionCard}

            <Card>
                <CardHeader>
                    <CardTitle>{t('settings.integrations.title')}</CardTitle>
                    <CardDescription>{t('settings.integrations.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <Mail className="h-6 w-6 text-muted-foreground" />
                            <div>
                                <h3 className="font-semibold">Gmail</h3>
                                <p className="text-sm text-muted-foreground">{t('settings.integrations.gmailDesc')}</p>
                            </div>
                        </div>
                        <GmailConnect />
                    </div>
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('settings.preferences.title')}</CardTitle>
                <CardDescription>{t('settings.preferences.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="countryCode"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('settings.preferences.countryLabel')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('settings.preferences.countryPlaceholder')}/>
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {countries.map(c => (
                                        <SelectItem key={c.value} value={c.value}>
                                            {c.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormDescription>{t('settings.preferences.countryDesc')}</FormDescription>
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="currencyPreference"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('settings.preferences.currencyLabel')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={t('settings.preferences.currencyPlaceholder')} />
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
                        <FormDescription>{t('settings.preferences.currencyDesc')}</FormDescription>
                        </FormItem>
                    )}
                    />
                 </div>
                 <FormField
                  control={form.control}
                  name="languagePreference"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>{t('settings.preferences.languageLabel')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder={t('settings.preferences.languagePlaceholder')} />
                          </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="si">Sinhala (සිංහල)</SelectItem>
                              <SelectItem value="ta">Tamil (தமிழ்)</SelectItem>
                          </SelectContent>
                      </Select>
                      <FormDescription>{t('settings.preferences.languageDesc')}</FormDescription>
                      </FormItem>
                  )}
                  />
                <FormField
                  control={form.control}
                  name="financialCycleStartDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings.preferences.cycleStartLabel')}</FormLabel>
                      <Input type="number" min="1" max="31" {...field} />
                      <FormDescription>{t('settings.preferences.cycleStartDesc')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="darkModeBanner"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel className="text-base">{t('settings.preferences.darkModeLabel')}</FormLabel>
                            <FormDescription>{t('settings.preferences.darkModeDesc')}</FormDescription>
                        </div>
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="showOnboardingOnLogin"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel className="text-base">{t('settings.preferences.onboardingLabel')}</FormLabel>
                            <FormDescription>{t('settings.preferences.onboardingDesc')}</FormDescription>
                        </div>
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {CustomCategoryUI}

            <Card>
              <CardHeader>
                <CardTitle>{t('settings.notifications.title')}</CardTitle>
                <CardDescription>{t('settings.notifications.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="notificationPreferences.budgetThreshold"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel className="text-base">{t('settings.notifications.budgetLabel')}</FormLabel>
                            <FormDescription>{t('settings.notifications.budgetDesc')}</FormDescription>
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
                            <FormLabel className="text-base">{t('settings.notifications.recurringLabel')}</FormLabel>
                            <FormDescription>{t('settings.notifications.recurringDesc')}</FormDescription>
                        </div>
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.legal.title')}</CardTitle>
                <CardDescription>{t('settings.legal.description')}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-start gap-4">
                <Button asChild variant="link" className="p-0 h-auto">
                    <Link href="/terms">{t('settings.legal.termsLink')}</Link>
                </Button>
                <Button asChild variant="link" className="p-0 h-auto">
                    <Link href="/privacy">{t('settings.legal.privacyLink')}</Link>
                </Button>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('settings.saveButton')}
              </Button>
            </div>
          </div>
        </main>
      </form>
    </Form>
    </TooltipProvider>
  );
}
