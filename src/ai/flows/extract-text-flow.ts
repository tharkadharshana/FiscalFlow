
'use server';
/**
 * @fileOverview An AI flow to extract raw text from an image.
 *
 * - extractText - A function that handles extracting text from an image.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const ExtractTextInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractTextInput = z.infer<typeof ExtractTextInputSchema>;

const ExtractTextOutputSchema = z.object({
  text: z.string().describe('The extracted text from the document.'),
});
export type ExtractTextOutput = z.infer<typeof ExtractTextOutputSchema>;


export async function extractText(input: ExtractTextInput): Promise<ExtractTextOutput> {
  return extractTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTextPrompt',
  input: {schema: ExtractTextInputSchema},
  output: {schema: ExtractTextOutputSchema},
  prompt: `You are an expert Optical Character Recognition (OCR) AI. Your only task is to analyze the provided image and extract all text content from it.

Return the extracted text exactly as it appears in the image.

Image: {{media url=photoDataUri}}`,
});

const extractTextFlow = ai.defineFlow(
  {
    name: 'extractTextFlow',
    inputSchema: ExtractTextInputSchema,
    outputSchema: ExtractTextOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
