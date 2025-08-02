
'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppContext } from '@/contexts/app-context';
import { TaxSettingsSchema, type TaxSettings } from '@/types/schemas';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { countries } from '@/data/countries';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function TaxRuleEditor() {
    const { taxRules, updateTaxRules } = useAppContext();
    const [selectedCountry, setSelectedCountry] = useState('LK');

    const form = useForm<TaxSettings>({
        resolver: zodResolver(TaxSettingsSchema),
        defaultValues: taxRules || undefined,
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "incomeTaxBrackets",
    });

    useEffect(() => {
        if (taxRules && taxRules.countryCode === selectedCountry) {
            form.reset(taxRules);
        }
    }, [taxRules, selectedCountry, form]);

    const onSubmit = async (data: TaxSettings) => {
        await updateTaxRules(selectedCountry, data);
    };
    
    if (!taxRules) {
        return (
            <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Alert>
                    <AlertTitle>Advanced Feature</AlertTitle>
                    <AlertDescription>
                        Editing these values will directly impact the results of the AI Tax Analysis engine. Proceed with caution.
                    </AlertDescription>
                </Alert>
                <div className="space-y-2">
                    <Label>Country Rules to Edit</Label>
                     <Select value={selectedCountry} onValueChange={setSelectedCountry} disabled>
                        <SelectTrigger>
                            <SelectValue placeholder="Select country rules to edit" />
                        </SelectTrigger>
                        <SelectContent>
                            {countries.map(c => (
                                <SelectItem key={c.value} value={c.value}>
                                    {c.label} ({c.value})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Currently, only editing Sri Lankan (LK) rules is supported.</p>
                </div>
               
                <Accordion type="multiple" defaultValue={['general', 'vehicle', 'income']} className="w-full">
                    <AccordionItem value="general">
                        <AccordionTrigger>General Rates & Tariffs</AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="vatRate" render={({ field }) => (
                                    <FormItem><FormLabel>VAT Rate (%)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) / 100)} value={field.value * 100} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="palRate" render={({ field }) => (
                                    <FormItem><FormLabel>PAL Rate (%)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) / 100)} value={field.value * 100} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="stampDutyRate" render={({ field }) => (
                                     <FormItem><FormLabel>Stamp Duty Rate (%)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) / 100)} value={field.value * 100} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="vehicle">
                        <AccordionTrigger>Vehicle Import Taxes</AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                             <FormField control={form.control} name="vehicleImport.cidRate" render={({ field }) => (
                                <FormItem><FormLabel>Customs Duty (CID) Rate (%)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) / 100)} value={field.value * 100}/></FormControl><FormMessage /></FormItem>
                            )} />
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="income">
                        <AccordionTrigger>Income Tax Brackets</AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-11 gap-2 items-end">
                                    <FormField control={form.control} name={`incomeTaxBrackets.${index}.limit`} render={({ field }) => (
                                        <FormItem className="col-span-5"><FormLabel>Up to (LKR)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name={`incomeTaxBrackets.${index}.rate`} render={({ field }) => (
                                        <FormItem className="col-span-5"><FormLabel>Rate (%)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) / 100)} value={field.value * 100}/></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => append({ limit: 0, rate: 0 })}><Plus className="mr-2 h-4 w-4" /> Add Bracket</Button>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                <div className="flex justify-end">
                    <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4"/>
                        Save Tax Rules
                    </Button>
                </div>
            </form>
        </Form>
    );
}
