import { NextRequest, NextResponse } from 'next/server';
import { buildCharacterPrompt, buildSpritePrompt, buildBackgroundPrompt, buildItemPrompt, buildUserPreferences } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    let prompt = '';

    if (type === 'character') {
      if (!data.description) {
        return NextResponse.json({ prompt: 'Enter a character description to see the generated prompt...' });
      }
      const stylePreferences = buildUserPreferences(
        data.art_style || 'None',
        data.mood || 'None',
        data.color_palette || 'None',
        data.character_style || 'None',
        data.line_style || 'None',
        data.composition || 'None',
        data.additional_notes || ''
      );
      prompt = buildCharacterPrompt(data.description, stylePreferences);
    } else if (type === 'sprite') {
      if (!data.description || !data.actions_text) {
        return NextResponse.json({ prompt: 'Enter character description and actions to see the generated prompt...' });
      }
      const actions = data.actions_text.split(',').map((a: string) => a.trim()).filter((a: string) => a);
      if (actions.length === 0) {
        return NextResponse.json({ prompt: 'Enter valid actions separated by commas...' });
      }
      const stylePreferences = buildUserPreferences(
        data.art_style || 'None',
        data.mood || 'None',
        data.color_palette || 'None',
        data.character_style || 'None',
        data.line_style || 'None',
        data.composition || 'None',
        data.additional_notes || ''
      );
      prompt = buildSpritePrompt(data.description, actions[0], stylePreferences);
    } else if (type === 'background') {
      if (!data.description) {
        return NextResponse.json({ prompt: 'Enter a background description to see the generated prompt...' });
      }
      const stylePreferences = buildUserPreferences(
        data.art_style || 'None',
        data.mood || 'None',
        data.color_palette || 'None',
        null,
        data.line_style || 'None',
        data.composition || 'None',
        data.additional_notes || ''
      );
      prompt = buildBackgroundPrompt(data.description, data.orientation || 'landscape', stylePreferences);
    } else if (type === 'item') {
      if (!data.description) {
        return NextResponse.json({ prompt: 'Enter an item description to see the generated prompt...' });
      }
      const stylePreferences = buildUserPreferences(
        data.art_style || 'None',
        data.mood || 'None',
        data.color_palette || 'None',
        null,
        data.line_style || 'None',
        data.composition || 'None',
        data.additional_notes || ''
      );
      prompt = buildItemPrompt(data.description, stylePreferences);
    }

    return NextResponse.json({ prompt });
  } catch (error: any) {
    console.error('Error generating prompt preview:', error);
    return NextResponse.json(
      { prompt: `Error generating prompt preview: ${error.message}` },
      { status: 500 }
    );
  }
}






