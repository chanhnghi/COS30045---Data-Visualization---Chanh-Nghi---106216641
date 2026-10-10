// Small interactions shared by the three pages. No external library is used.

document.querySelectorAll('.faq-trigger').forEach((button) => {
  button.addEventListener('click', () => {
    const answer = document.getElementById(button.getAttribute('aria-controls'));
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!isOpen));
    answer.hidden = isOpen;
  });
});

const calculator = document.getElementById('energy-calculator');
if (calculator) {
  const wattsInput = document.getElementById('watts');
  const hoursInput = document.getElementById('hours');
  const priceInput = document.getElementById('price');
  const error = document.getElementById('calculator-error');
  const dailyOutput = document.getElementById('daily-energy');
  const yearlyOutput = document.getElementById('yearly-energy');
  const costOutput = document.getElementById('yearly-cost');
  const decimal = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 2 });
  const money = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });

  function calculate(event) {
    if (event) event.preventDefault();
    const watts = Number(wattsInput.value);
    const hours = Number(hoursInput.value);
    const cents = Number(priceInput.value);
    let message = '';

    if (!wattsInput.value || !Number.isFinite(watts) || watts <= 0) {
      message = 'Enter a power draw greater than 0 watts.';
    } else if (!hoursInput.value || !Number.isFinite(hours) || hours <= 0 || hours > 24) {
      message = 'Enter daily use between 0 and 24 hours.';
    } else if (!priceInput.value || !Number.isFinite(cents) || cents < 0) {
      message = 'Enter an electricity price of 0 cents or more.';
    }

    error.textContent = message;
    if (message) {
      dailyOutput.textContent = '—';
      yearlyOutput.textContent = '—';
      costOutput.textContent = '—';
      return;
    }

    const dailyKwh = (watts / 1000) * hours;
    const yearlyKwh = dailyKwh * 365;
    const yearlyCost = yearlyKwh * cents / 100;
    dailyOutput.textContent = decimal.format(dailyKwh);
    yearlyOutput.textContent = decimal.format(yearlyKwh);
    costOutput.textContent = money.format(yearlyCost);
  }

  calculator.addEventListener('submit', calculate);
  [wattsInput, hoursInput, priceInput].forEach((input) => input.addEventListener('input', calculate));
  calculate();
}
