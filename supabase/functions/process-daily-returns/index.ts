import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BotInvestment {
  id: string;
  user_id: string;
  bot_id: string;
  initial_amount: number;
  locked_amount: number;
  accumulated_returns: number;
  daily_return_rate: number;
  start_date: string;
  end_date: string;
  status: string;
  auto_reinvest?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting daily returns processing...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0];
    console.log('Processing date:', today);

    // Get all active bot investments
    const { data: activeInvestments, error: fetchError } = await supabase
      .from('bot_investments')
      .select('*')
      .eq('status', 'active');

    if (fetchError) {
      console.error('Error fetching investments:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${activeInvestments?.length || 0} active investments`);

    let processedCount = 0;
    let expiredCount = 0;

    for (const investment of (activeInvestments || [])) {
      const inv = investment as unknown as BotInvestment;
      
      // Check if investment has expired
      const endDate = new Date(inv.end_date);
      const now = new Date();
      
      if (endDate <= now && inv.status === 'active') {
        console.log(`Processing expired investment ${inv.id}`);
        await processExpiredInvestment(supabase, inv);
        expiredCount++;
        continue;
      }

      // Calculate daily return
      const dailyReturn = Number(inv.locked_amount) * Number(inv.daily_return_rate) / 100;
      console.log(`Investment ${inv.id}: Daily return = ${dailyReturn}`);

      // Check if return already exists for today
      const { data: existingReturn } = await supabase
        .from('bot_returns')
        .select('id')
        .eq('user_id', inv.user_id)
        .eq('bot_id', inv.bot_id)
        .eq('allocation_id', inv.id)
        .eq('date', today)
        .maybeSingle();

      if (existingReturn) {
        console.log(`Return already processed for investment ${inv.id} on ${today}`);
        continue;
      }

      // Update accumulated returns for this investment
      const newAccumulatedReturns = Number(inv.accumulated_returns || 0) + dailyReturn;

      // Calculate user's total cumulative returns across all bots
      const { data: previousReturns } = await supabase
        .from('bot_returns')
        .select('daily_return')
        .eq('user_id', inv.user_id);
      
      const totalPreviousReturns = (previousReturns || []).reduce(
        (sum, r) => sum + Number(r.daily_return), 
        0
      );
      const newCumulativeReturn = totalPreviousReturns + dailyReturn;

      // Insert bot_returns record
      const { error: insertError } = await supabase
        .from('bot_returns')
        .insert({
          user_id: inv.user_id,
          bot_id: inv.bot_id,
          allocation_id: inv.id,
          date: today,
          daily_return: dailyReturn,
          cumulative_return: newCumulativeReturn,
        });

      if (insertError) {
        console.error(`Error inserting return for investment ${inv.id}:`, insertError);
        continue;
      }

      // Update bot_investments accumulated_returns
      const { error: updateInvError } = await supabase
        .from('bot_investments')
        .update({ accumulated_returns: newAccumulatedReturns })
        .eq('id', inv.id);

      if (updateInvError) {
        console.error(`Error updating investment ${inv.id}:`, updateInvError);
        continue;
      }

      // Update user's returns_balance
      const { error: balanceError } = await supabase.rpc('increment_returns_balance', {
        p_user_id: inv.user_id,
        p_amount: dailyReturn,
      });

      if (balanceError) {
        console.error(`Error updating balance for user ${inv.user_id}:`, balanceError);
        continue;
      }

      // Create activity record
      await supabase.from('activities').insert({
        user_id: inv.user_id,
        activity_type: 'bot_return',
        description: `Daily return credited: $${dailyReturn.toFixed(2)}`,
        amount: dailyReturn,
        status: 'completed',
      });

      processedCount++;
      console.log(`Successfully processed return for investment ${inv.id}`);
    }

    console.log(`Processing complete: ${processedCount} returns processed, ${expiredCount} investments expired`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        expired: expiredCount,
        message: 'Daily returns processed successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-daily-returns:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processExpiredInvestment(supabase: any, investment: BotInvestment) {
  console.log(`Expiring investment ${investment.id}`);

  const totalCredit = Number(investment.locked_amount) + Number(investment.accumulated_returns || 0);

  // Update bot_investments status
  const { error: updateError } = await supabase
    .from('bot_investments')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', investment.id);

  if (updateError) {
    console.error(`Error updating investment status:`, updateError);
    throw updateError;
  }

  // Move funds back to available balance
  const { error: balanceError } = await supabase.rpc('credit_expired_investment', {
    p_user_id: investment.user_id,
    p_locked_amount: investment.locked_amount,
    p_returns_amount: investment.accumulated_returns || 0,
  });

  if (balanceError) {
    console.error(`Error crediting balance:`, balanceError);
    throw balanceError;
  }

  // Create transaction record
  await supabase.from('transactions').insert({
    user_id: investment.user_id,
    type: 'bot_return_credit',
    amount: totalCredit,
    status: 'approved',
    bot_id: investment.bot_id,
    allocation_id: investment.id,
    notes: `Bot allocation completed. Principal + returns credited.`,
  });

  // Create activity record
  await supabase.from('activities').insert({
    user_id: investment.user_id,
    activity_type: 'bot_return_credit',
    description: `Bot allocation period ended — $${totalCredit.toFixed(2)} credited to available balance`,
    amount: totalCredit,
    status: 'completed',
  });

  console.log(`Successfully expired investment ${investment.id}, credited $${totalCredit}`);

  // Auto-reinvest handling
  if (investment.auto_reinvest) {
    await autoReinvest(supabase, investment);
  }
}

async function autoReinvest(supabase: any, investment: BotInvestment) {
  const reinvestAmount = Number(investment.initial_amount);
  console.log(`Auto-reinvest: attempting $${reinvestAmount} for user ${investment.user_id} into bot ${investment.bot_id}`);

  // Verify bot is still active and get current terms
  const { data: bot, error: botError } = await supabase
    .from('ai_bots')
    .select('id, name, daily_return_rate, minimum_investment, duration_days, is_active, status, auto_reinvest_enabled')
    .eq('id', investment.bot_id)
    .maybeSingle();

  if (botError || !bot || !bot.is_active || bot.status === 'archived') {
    console.log(`Auto-reinvest skipped: bot inactive/archived`);
    await supabase.from('activities').insert({
      user_id: investment.user_id,
      activity_type: 'bot_allocation',
      description: `Auto-reinvest skipped — bot is no longer available.`,
      status: 'failed',
    });
    return;
  }

  if (reinvestAmount < Number(bot.minimum_investment || 0)) {
    console.log(`Auto-reinvest skipped: amount below current minimum`);
    return;
  }

  // Check wallet balance
  const { data: wallet } = await supabase
    .from('wallets')
    .select('available_balance, locked_balance')
    .eq('user_id', investment.user_id)
    .maybeSingle();

  if (!wallet || Number(wallet.available_balance) < reinvestAmount) {
    console.log(`Auto-reinvest skipped: insufficient balance`);
    await supabase.from('activities').insert({
      user_id: investment.user_id,
      activity_type: 'bot_allocation',
      description: `Auto-reinvest of $${reinvestAmount.toFixed(2)} into ${bot.name} skipped — insufficient available balance.`,
      amount: reinvestAmount,
      status: 'failed',
    });
    return;
  }

  const durationDays = Number(bot.duration_days || 30);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + durationDays);

  // Create new investment (preserve auto_reinvest so it keeps rolling)
  const { data: newInvestment, error: newInvError } = await supabase
    .from('bot_investments')
    .insert({
      user_id: investment.user_id,
      bot_id: investment.bot_id,
      initial_amount: reinvestAmount,
      locked_amount: reinvestAmount,
      daily_return_rate: bot.daily_return_rate,
      start_date: new Date().toISOString(),
      end_date: endDate.toISOString(),
      status: 'active',
      auto_reinvest: true,
    })
    .select()
    .single();

  if (newInvError) {
    console.error(`Auto-reinvest failed to create investment:`, newInvError);
    return;
  }

  // Move funds available -> locked
  const { error: walletErr } = await supabase
    .from('wallets')
    .update({
      available_balance: Number(wallet.available_balance) - reinvestAmount,
      locked_balance: Number(wallet.locked_balance || 0) + reinvestAmount,
    })
    .eq('user_id', investment.user_id);

  if (walletErr) {
    console.error(`Auto-reinvest wallet update failed:`, walletErr);
    return;
  }

  await supabase.from('transactions').insert({
    user_id: investment.user_id,
    type: 'bot_allocation',
    amount: reinvestAmount,
    status: 'approved',
    bot_id: investment.bot_id,
    allocation_id: newInvestment.id,
    notes: 'Auto-reinvestment from expired allocation',
  });

  await supabase.from('activities').insert({
    user_id: investment.user_id,
    activity_type: 'bot_allocation',
    description: `Auto-reinvested $${reinvestAmount.toFixed(2)} into ${bot.name}`,
    amount: reinvestAmount,
    status: 'approved',
  });

  await supabase.rpc('create_notification', {
    p_user_id: investment.user_id,
    p_title: 'Auto-Reinvestment Successful',
    p_message: `$${reinvestAmount.toFixed(2)} has been automatically re-invested into ${bot.name} for another ${durationDays}-day cycle.`,
    p_type: 'bot_allocation',
    p_metadata: { allocation_id: newInvestment.id, amount: reinvestAmount },
  });

  console.log(`Auto-reinvest complete: new investment ${newInvestment.id}`);
}
