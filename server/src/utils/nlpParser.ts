import OpenAI from 'openai';
import { format, parseISO } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

const TIME_ZONE = 'Asia/Kolkata';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  dangerouslyAllowBrowser: false,
});

interface ParsedTask {
  description: string;
  assignee: string;
  dueDate: string; // ISO string
  priority: 'P1' | 'P2' | 'P3' | 'P4';
}

export async function parseTaskFromText(text: string): Promise<ParsedTask> {
  const currentDate = new Date();
  const today = format(currentDate, 'yyyy-MM-dd');
  const tomorrow = format(new Date(currentDate.getTime() + 86400000), 'yyyy-MM-dd');
  
  // Calculate next Friday
  const daysUntilFriday = (5 - currentDate.getDay() + 7) % 7 || 7;
  const nextFriday = new Date(currentDate);
  nextFriday.setDate(currentDate.getDate() + daysUntilFriday);
  const friday = format(nextFriday, 'yyyy-MM-dd');

  // Pre-process the input to ensure text preservation
  const preservedText = text;
  
  const systemPrompt = `Extract the core task into this JSON format. Follow these rules STRICTLY:

{
  "description": "concise task description (MUST be 5-8 words, no exceptions)",
  "assignee": "name|me|",
  "dueDate": "ISO date",
  "priority": "P1|P2|P3|P4"
}

IMPORTANT: The description MUST be 5-8 words. If it's shorter, add more specific details. If longer, make it more concise.

RULES:
1. Description: 
   - Extract ONLY the main action + object (e.g., "Review PR")
   - 5-8 words maximum
   - Start with a verb (e.g., "Create", "Update", "Fix")
   - No greetings, explanations, or extra details
   
2. Assignee:
   - "me" if personal (I/me/my)
   - Name if assigned (e.g., "John")
   - Empty if team task

3. Priority:
   - P1: Urgent/Critical (ASAP)
   - P2: Important (Today)
   - P3: Normal (This week)
   - P4: Low (When possible)

4. Due Date:
   - Only if explicitly mentioned
   - Use ISO format
   - Default time: 5 PM if not specified

EXAMPLES:
Input: "Hey team, can someone please review the latest PR for the dashboard?"
→ {"description":"Review and approve dashboard PR changes","assignee":""}

Input: "I need to fix the login page by EOD"
→ {"description":"Fix login page authentication issues","assignee":"me","priority":"P1","dueDate":"${today}T17:00:00+05:30"}

Input: "Aman, the landing page needs to be mobile responsive by tomorrow 4pm"
→ {"description":"Implement responsive design for landing page","assignee":"Aman","dueDate":"${tomorrow}T16:00:00+05:30"}

Input: "Let's schedule a meeting to discuss the new project requirements"
→ {"description":"Schedule project requirements discussion meeting","assignee":""}
`;



  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: systemPrompt 
        },
        { 
          role: 'user', 
          content: `Process this task exactly as written. STRICTLY follow these rules:
1. Description MUST be 5-8 words
2. Start with a verb
3. Be specific and actionable

Task: "${preservedText}"`
        }
      ],
      temperature: 0.1,  // Very low temperature for consistent output
      top_p: 0.1,       // Focus on most likely tokens
      max_tokens: 200,
      response_format: { type: 'json_object' },
      presence_penalty: -1.0  // Encourage using full word range
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from OpenAI');

    // Parse the response with validation
    const parsed = JSON.parse(content) as Partial<ParsedTask>;
    
    // Validate and clean the parsed data
    if (!parsed.description?.trim()) {
      // Fallback to original text if description is empty
      parsed.description = preservedText;
    } else {
        // Ensure the description is a string and trim whitespace
      parsed.description = String(parsed.description).trim();
    }
    
    // Set default assignee if not provided
  if (!parsed.assignee) {
    parsed.assignee = 'me';
  }
  
  // Set default priority if not provided or invalid
  if (!parsed.priority || !['P1', 'P2', 'P3', 'P4'].includes(parsed.priority)) {
    parsed.priority = 'P3';
  }
  
    // Parse the date string and ensure it's valid
    let dueDate: Date;
    try {
      // If no due date provided, default to today 5 PM
      if (!parsed.dueDate) {
        const todayAt5PM = new Date();
        todayAt5PM.setHours(17, 0, 0, 0);
        dueDate = todayAt5PM;
      } else {
        // First try to parse as ISO string
        dueDate = new Date(parsed.dueDate);
        
        // If parsing fails or results in invalid date, use current time + 1 hour
        if (isNaN(dueDate.getTime())) {
          console.warn('Invalid date from AI, using current time + 1 hour');
          dueDate = new Date(Date.now() + 60 * 60 * 1000);
        }
      }
    } catch (error) {
      console.warn('Error parsing date, using current time + 1 hour:', error);
      dueDate = new Date(Date.now() + 60 * 60 * 1000);
    }
  
    // Ensure the date is in the future
    const now = new Date();
    if (dueDate <= now) {
      dueDate = new Date(now.getTime() + 60 * 60 * 1000);
    }

    // Convert to ISO string in the correct timezone
    const zonedDueDate = toZonedTime(dueDate, TIME_ZONE);
    const formattedDueDate = format(zonedDueDate, "yyyy-MM-dd'T'HH:mm:ssXXX");

    // Clean up: remove assignee name from description if accidentally present
    const assignee = parsed.assignee || '';
    let finalDescription = parsed.description;
    if (assignee && assignee !== 'me' && parsed.description.toLowerCase().includes(assignee.toLowerCase())) {
      finalDescription = parsed.description.replace(new RegExp(assignee, 'i'), '').trim();
    }

    // Ensure the task has all required fields with proper types
    const task: ParsedTask = {
      description: finalDescription,
      assignee: assignee,
      dueDate: formattedDueDate,
      priority: (parsed.priority as 'P1' | 'P2' | 'P3' | 'P4') || 'P3',
    };

    return task;
  } catch (error) {
    console.error('Error processing task:', error);
    // Fallback to a basic task with the original text
    const fallbackDate = formatInTimeZone(new Date(), TIME_ZONE, "yyyy-MM-dd'T'17:00:00XXX");
    return {
      description: preservedText,
      assignee: 'me',
      dueDate: fallbackDate,
      priority: 'P3',
    };
  }
}
