/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CompoundCalcRequest,
  CompoundCalcResponse,
  SIPCalcRequest,
  SIPCalcResponse,
  GoalCalcRequest,
  GoalCalcResponse,
  InflationCalcRequest,
  InflationCalcResponse,
  StepUpSIPRequest,
  StepUpSIPResponse,
  Projection
} from '../types.js';

/**
 * Calculates Compound Interest.
 * Formula: A = P * (1 + r/n)^(n * t)
 */
export function calculateCompoundInterest(req: CompoundCalcRequest, inflationRate: number = 0): CompoundCalcResponse {
  const { principal, rate, duration, frequency } = req;
  const r = rate / 100;
  const inf = inflationRate / 100;
  
  let n = 1;
  if (frequency === 'monthly') n = 12;
  else if (frequency === 'quarterly') n = 4;
  else if (frequency === 'semi-annually') n = 2;

  const projections: Projection[] = [];

  for (let year = 1; year <= duration; year++) {
    const finalAmount = principal * Math.pow(1 + r / n, n * year);
    const interestEarned = finalAmount - principal;
    const purchasingPower = inf > 0 ? finalAmount / Math.pow(1 + inf, year) : undefined;

    projections.push({
      year,
      invested_amount: Math.round(principal),
      interest_earned: Math.round(interestEarned),
      maturity_amount: Math.round(finalAmount),
      purchasing_power: purchasingPower ? Math.round(purchasingPower) : undefined,
    });
  }

  const lastProj = projections[projections.length - 1];

  return {
    finalAmount: lastProj.maturity_amount,
    interestEarned: lastProj.interest_earned,
    projections,
  };
}

/**
 * Calculates SIP (Systematic Investment Plan) returns.
 * Standard Annuity Due Formula: M = S * [((1 + i)^n - 1) / i] * (1 + i)
 * Where S is monthly investment, i is monthly interest rate, n is number of months.
 */
export function calculateSIP(req: SIPCalcRequest, inflationRate: number = 0): SIPCalcResponse {
  const { monthlySip, rate, duration } = req;
  const i = rate / 100 / 12;
  const inf = inflationRate / 100;

  const projections: Projection[] = [];

  for (let year = 1; year <= duration; year++) {
    const months = year * 12;
    const invested = monthlySip * months;
    
    let finalCorpus = 0;
    if (i === 0) {
      finalCorpus = invested;
    } else {
      finalCorpus = monthlySip * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
    }

    const returns = finalCorpus - invested;
    const purchasingPower = inf > 0 ? finalCorpus / Math.pow(1 + inf, year) : undefined;

    projections.push({
      year,
      invested_amount: Math.round(invested),
      interest_earned: Math.round(returns),
      maturity_amount: Math.round(finalCorpus),
      purchasing_power: purchasingPower ? Math.round(purchasingPower) : undefined,
    });
  }

  const lastProj = projections[projections.length - 1];

  return {
    totalInvestment: lastProj.invested_amount,
    totalReturns: lastProj.interest_earned,
    finalCorpus: lastProj.maturity_amount,
    projections,
  };
}

/**
 * Goal Based Planner - Calculates required monthly SIP to meet a target.
 * Formula is reverse of SIP annuity due:
 * S = TargetAmount / [ ((1 + i)^n - 1) / i * (1 + i) ]
 */
export function calculateGoalSIP(req: GoalCalcRequest, inflationRate: number = 0): GoalCalcResponse {
  const { targetAmount, rate, duration } = req;
  const i = rate / 100 / 12;
  const months = duration * 12;
  const inf = inflationRate / 100;

  let requiredMonthlySip = 0;
  if (i === 0) {
    requiredMonthlySip = targetAmount / months;
  } else {
    requiredMonthlySip = targetAmount / (((Math.pow(1 + i, months) - 1) / i) * (1 + i));
  }

  // Adjust for visual display and construct projections
  requiredMonthlySip = Math.round(requiredMonthlySip * 100) / 100;

  const sipRes = calculateSIP({
    monthlySip: requiredMonthlySip,
    rate,
    duration,
  }, inflationRate);

  return {
    requiredMonthlySip,
    totalInvestment: sipRes.totalInvestment,
    totalReturns: sipRes.totalReturns,
    projections: sipRes.projections,
  };
}

/**
 * Present Value of Future Amount (Inflation Calculator)
 * Formula: PV = FV / (1 + inf)^t
 */
export function calculateInflation(req: InflationCalcRequest): InflationCalcResponse {
  const { futureAmount, inflationRate, duration } = req;
  const inf = inflationRate / 100;
  const presentValue = futureAmount / Math.pow(1 + inf, duration);

  return {
    presentValue: Math.round(presentValue),
  };
}

/**
 * Step-Up SIP Calculator.
 * Monthly investment hikes annually by annualIncrementPercent.
 * Solved via precise month-by-month compounding.
 */
export function calculateStepUpSIP(req: StepUpSIPRequest, inflationRate: number = 0): StepUpSIPResponse {
  const { initialSip, annualIncrementPercent, duration, rate } = req;
  const i = rate / 100 / 12;
  const stepUpFactor = 1 + (annualIncrementPercent / 100);
  const inf = inflationRate / 100;

  const projections: Projection[] = [];
  
  let balance = 0;
  let totalInvested = 0;

  for (let year = 1; year <= duration; year++) {
    const currentYearSip = initialSip * Math.pow(stepUpFactor, year - 1);
    
    // Simulate 12 months for this specific year
    for (let month = 1; month <= 12; month++) {
      totalInvested += currentYearSip;
      balance = (balance + currentYearSip) * (1 + i);
    }

    const returns = balance - totalInvested;
    const purchasingPower = inf > 0 ? balance / Math.pow(1 + inf, year) : undefined;

    projections.push({
      year,
      invested_amount: Math.round(totalInvested),
      interest_earned: Math.round(returns),
      maturity_amount: Math.round(balance),
      purchasing_power: purchasingPower ? Math.round(purchasingPower) : undefined,
    });
  }

  const lastProj = projections[projections.length - 1];

  return {
    finalCorpus: lastProj.maturity_amount,
    totalInvestment: lastProj.invested_amount,
    totalReturns: lastProj.interest_earned,
    projections,
  };
}
