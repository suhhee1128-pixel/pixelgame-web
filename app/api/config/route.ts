import { NextRequest, NextResponse } from 'next/server';
import { getGlobalConfigManager } from '@/lib/config-manager';
import { buildUserPreferences } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const configManager = getGlobalConfigManager();
    const configNames = await configManager.getConfigNames();
    return NextResponse.json({ configs: ['None', ...configNames] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load configs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config_name, ...configData } = body;

    const configManager = getGlobalConfigManager();

    if (action === 'save') {
      const stylePreferences = buildUserPreferences(
        configData.art_style || 'None',
        configData.mood || 'None',
        configData.color_palette || 'None',
        configData.character_style || 'None',
        configData.line_style || 'None',
        configData.composition || 'None',
        configData.additional_notes || ''
      );

      const success = await configManager.saveConfig(config_name, stylePreferences);
      if (success) {
        return NextResponse.json({ success: true, message: `Setting '${config_name}' saved successfully!` });
      } else {
        return NextResponse.json({ success: false, error: 'Failed to save setting' }, { status: 500 });
      }
    } else if (action === 'load') {
      if (!config_name || config_name === 'None') {
        return NextResponse.json({
          art_style: 'None',
          mood: 'None',
          color_palette: 'None',
          character_style: 'None',
          line_style: 'None',
          composition: 'None',
          additional_notes: '',
          message: '설정을 선택해주세요.'
        });
      }

      const config = await configManager.loadConfig(config_name);
      if (config) {
        return NextResponse.json({
          art_style: config.art_style || 'None',
          mood: config.mood || 'None',
          color_palette: config.color_palette || 'None',
          character_style: config.character_style || 'None',
          line_style: config.line_style || 'None',
          composition: config.composition || 'None',
          additional_notes: config.additional_notes || '',
          message: `✅ 설정 '${config_name}'을 불러왔습니다!`
        });
      } else {
        return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
      }
    } else if (action === 'delete') {
      if (!config_name || config_name === 'None') {
        const configNames = await configManager.getConfigNames();
        return NextResponse.json({
          success: false,
          message: 'Please select a setting to delete.',
          configs: ['None', ...configNames]
        });
      }

      const success = await configManager.deleteConfig(config_name);
      if (success) {
        const configNames = await configManager.getConfigNames();
        return NextResponse.json({
          success: true,
          message: `✅ Setting '${config_name}' deleted successfully!`,
          configs: ['None', ...configNames]
        });
      } else {
        const configNames = await configManager.getConfigNames();
        return NextResponse.json({
          success: false,
          message: `❌ Failed to delete setting '${config_name}'.`,
          configs: ['None', ...configNames]
        });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Config API error:', error);
    return NextResponse.json(
      { error: error.message || 'Config operation failed' },
      { status: 500 }
    );
  }
}



