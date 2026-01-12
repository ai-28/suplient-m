import { NextResponse } from 'next/server';
import { 
  getEnrollmentsNeedingDeliveryToday, 
  deliverProgramElements 
} from '@/app/lib/services/programDeliveryService';

// Set max duration for long-running jobs (Vercel limit is 300s for Pro)
export const maxDuration = 300;

export async function GET(request) {
  try {
    // Verify cron secret (for security)
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    console.log(`[Program Delivery] Starting daily delivery for ${todayStr}`);
    
    // Get all enrollments needing delivery today
    const enrollments = await getEnrollmentsNeedingDeliveryToday(today);
    
    console.log(`[Program Delivery] Found ${enrollments.length} enrollments to check`);
    
    const results = {
      processed: 0,
      delivered: 0,
      skipped: 0,
      errors: []
    };
    
    // Process each enrollment
    for (const enrollment of enrollments) {
      try {
        results.processed++;
        
        const result = await deliverProgramElements(
          enrollment.enrollmentId,
          enrollment.programDay,
          today
        );
        
        if (result.delivered) {
          results.delivered++;
          console.log(`[Program Delivery] Delivered Day ${enrollment.programDay} to enrollment ${enrollment.enrollmentId}`);
        } else {
          results.skipped++;
          console.log(`[Program Delivery] Skipped enrollment ${enrollment.enrollmentId}: ${result.reason}`);
        }
      } catch (error) {
        console.error(`[Program Delivery] Error delivering to enrollment ${enrollment.enrollmentId}:`, error);
        results.errors.push({
          enrollmentId: enrollment.enrollmentId,
          programDay: enrollment.programDay,
          error: error.message
        });
      }
    }
    
    console.log(`[Program Delivery] Completed: ${results.delivered} delivered, ${results.skipped} skipped, ${results.errors.length} errors`);
    
    return NextResponse.json({
      success: true,
      date: todayStr,
      ...results
    });
    
  } catch (error) {
    console.error('[Program Delivery] Error in daily program delivery:', error);
    return NextResponse.json(
      { error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}

