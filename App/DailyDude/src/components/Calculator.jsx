import React, { useState } from 'react';

const Calculator = () => {
  const [display, setDisplay] = useState('0');
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [pendingOperator, setPendingOperator] = useState(null);
  const [previousValue, setPreviousValue] = useState(null);

  const formatDisplay = (value) => {
    if (value.includes('.')) {
      const [integer, fraction] = value.split('.');
      return `${integer.slice(0, 10)}.${fraction.slice(0, 6)}`;
    }
    return value.slice(0, 16);
  };

  const inputDigit = (digit) => {
    if (waitingForOperand) {
      setDisplay(String(digit));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? String(digit) : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setWaitingForOperand(false);
    setPendingOperator(null);
    setPreviousValue(null);
  };

  const deleteLastChar = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const changeSign = () => {
    const value = parseFloat(display);
    setDisplay(String(-value));
  };

  const performOperation = (operator) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (pendingOperator) {
      const newValue = calculate(previousValue, inputValue, pendingOperator);
      setPreviousValue(newValue);
      setDisplay(String(newValue));
    }

    setWaitingForOperand(true);
    setPendingOperator(operator);
  };

  const calculate = (a, b, op) => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '×': return a * b;
      case '÷': return b !== 0 ? a / b : 'Error';
      default: return b;
    }
  };

  const handleEquals = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && pendingOperator) {
      const newValue = calculate(previousValue, inputValue, pendingOperator);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setPendingOperator(null);
      setWaitingForOperand(true);
    }
  };

  const buttonClass = "w-full h-16 rounded-lg font-bold text-lg focus:outline-none transition-colors duration-150";
  const numberButtonClass = `${buttonClass} bg-gray-200 text-text hover:bg-gray-300`;
  const operatorButtonClass = `${buttonClass} bg-primary text-white hover:bg-customblue-400`;
  const functionButtonClass = `${buttonClass} bg-gray-300 text-text hover:bg-gray-400`;
  const equalsButtonClass = `${buttonClass} bg-secondary text-white hover:bg-green-600`;

  return (
    <div className="bg-card p-4 rounded-lg shadow-lg max-w-sm mx-auto">
      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <div className="text-right text-lg text-gray-600 h-6">
          {previousValue !== null ? `${formatDisplay(String(previousValue))} ${pendingOperator || ''}` : ''}
        </div>
        <div className="text-right text-3xl font-bold text-text">
          {formatDisplay(display)}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <button className={functionButtonClass} onClick={clear}>C</button>
        <button className={functionButtonClass} onClick={deleteLastChar}>DEL</button>
        <button className={functionButtonClass} onClick={changeSign}>+/-</button>
        <button className={operatorButtonClass} onClick={() => performOperation('÷')}>÷</button>

        <button className={numberButtonClass} onClick={() => inputDigit(7)}>7</button>
        <button className={numberButtonClass} onClick={() => inputDigit(8)}>8</button>
        <button className={numberButtonClass} onClick={() => inputDigit(9)}>9</button>
        <button className={operatorButtonClass} onClick={() => performOperation('×')}>×</button>

        <button className={numberButtonClass} onClick={() => inputDigit(4)}>4</button>
        <button className={numberButtonClass} onClick={() => inputDigit(5)}>5</button>
        <button className={numberButtonClass} onClick={() => inputDigit(6)}>6</button>
        <button className={operatorButtonClass} onClick={() => performOperation('-')}>-</button>

        <button className={numberButtonClass} onClick={() => inputDigit(1)}>1</button>
        <button className={numberButtonClass} onClick={() => inputDigit(2)}>2</button>
        <button className={numberButtonClass} onClick={() => inputDigit(3)}>3</button>
        <button className={operatorButtonClass} onClick={() => performOperation('+')}>+</button>

        <button className={`${numberButtonClass} col-span-2`} onClick={() => inputDigit(0)}>0</button>
        <button className={numberButtonClass} onClick={inputDecimal}>.</button>
        <button className={equalsButtonClass} onClick={handleEquals}>=</button>
      </div>
    </div>
  );
};

export default Calculator;