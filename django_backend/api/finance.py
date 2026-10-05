import math

def calculate_compound_interest(principal: float, rate: float, duration: int, frequency: str = 'annually', inflation_rate: float = 0.0):
    r = rate / 100.0
    inf = inflation_rate / 100.0

    n = 1
    if frequency == 'monthly':
        n = 12
    elif frequency == 'quarterly':
        n = 4
    elif frequency == 'semi-annually':
        n = 2

    projections = []
    for year in range(1, duration + 1):
        final_amount = principal * math.pow(1.0 + r / n, n * year)
        interest_earned = final_amount - principal
        purchasing_power = (final_amount / math.pow(1.0 + inf, year)) if inf > 0 else None

        proj = {
            'year': year,
            'invested_amount': round(principal),
            'interest_earned': round(interest_earned),
            'maturity_amount': round(final_amount),
        }
        if purchasing_power is not None:
            proj['purchasing_power'] = round(purchasing_power)
        projections.append(proj)

    last_proj = projections[-1] if projections else {
        'maturity_amount': round(principal),
        'interest_earned': 0
    }

    return {
        'finalAmount': last_proj['maturity_amount'],
        'interestEarned': last_proj['interest_earned'],
        'projections': projections,
    }

def calculate_sip(monthly_sip: float, rate: float, duration: int, inflation_rate: float = 0.0):
    i = (rate / 100.0) / 12.0
    inf = inflation_rate / 100.0

    projections = []
    for year in range(1, duration + 1):
        months = year * 12
        invested = monthly_sip * months

        if i == 0:
            final_corpus = invested
        else:
            final_corpus = monthly_sip * ((math.pow(1.0 + i, months) - 1.0) / i) * (1.0 + i)

        returns = final_corpus - invested
        purchasing_power = (final_corpus / math.pow(1.0 + inf, year)) if inf > 0 else None

        proj = {
            'year': year,
            'invested_amount': round(invested),
            'interest_earned': round(returns),
            'maturity_amount': round(final_corpus),
        }
        if purchasing_power is not None:
            proj['purchasing_power'] = round(purchasing_power)
        projections.append(proj)

    last_proj = projections[-1] if projections else {
        'invested_amount': 0,
        'interest_earned': 0,
        'maturity_amount': 0
    }

    return {
        'totalInvestment': last_proj['invested_amount'],
        'totalReturns': last_proj['interest_earned'],
        'finalCorpus': last_proj['maturity_amount'],
        'projections': projections,
    }

def calculate_goal_sip(target_amount: float, rate: float, duration: int, inflation_rate: float = 0.0):
    i = (rate / 100.0) / 12.0
    months = duration * 12

    if i == 0:
        required_monthly_sip = target_amount / months
    else:
        required_monthly_sip = target_amount / (((math.pow(1.0 + i, months) - 1.0) / i) * (1.0 + i))

    required_monthly_sip = round(required_monthly_sip, 2)
    sip_res = calculate_sip(required_monthly_sip, rate, duration, inflation_rate)

    return {
        'requiredMonthlySip': required_monthly_sip,
        'totalInvestment': sip_res['totalInvestment'],
        'totalReturns': sip_res['totalReturns'],
        'projections': sip_res['projections'],
    }

def calculate_inflation(future_amount: float, inflation_rate: float, duration: int):
    inf = inflation_rate / 100.0
    present_value = future_amount / math.pow(1.0 + inf, duration)
    return {
        'presentValue': round(present_value),
    }

def calculate_stepup_sip(initial_sip: float, annual_increment_percent: float, duration: int, rate: float, inflation_rate: float = 0.0):
    i = (rate / 100.0) / 12.0
    step_up_factor = 1.0 + (annual_increment_percent / 100.0)
    inf = inflation_rate / 100.0

    projections = []
    balance = 0.0
    total_invested = 0.0

    for year in range(1, duration + 1):
        current_year_sip = initial_sip * math.pow(step_up_factor, year - 1)
        for _ in range(12):
            total_invested += current_year_sip
            balance = (balance + current_year_sip) * (1.0 + i)

        returns = balance - total_invested
        purchasing_power = (balance / math.pow(1.0 + inf, year)) if inf > 0 else None

        proj = {
            'year': year,
            'invested_amount': round(total_invested),
            'interest_earned': round(returns),
            'maturity_amount': round(balance),
        }
        if purchasing_power is not None:
            proj['purchasing_power'] = round(purchasing_power)
        projections.append(proj)

    last_proj = projections[-1] if projections else {
        'maturity_amount': 0,
        'invested_amount': 0,
        'interest_earned': 0
    }

    return {
        'finalCorpus': last_proj['maturity_amount'],
        'totalInvestment': last_proj['invested_amount'],
        'totalReturns': last_proj['interest_earned'],
        'projections': projections,
    }
