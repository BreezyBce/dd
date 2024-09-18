import React, { useState, useEffect } from 'react';

const UnitConverter = () => {
  const [amount, setAmount] = useState('1');
  const [fromUnit, setFromUnit] = useState('m');
  const [toUnit, setToUnit] = useState('km');
  const [result, setResult] = useState('');
  const [category, setCategory] = useState('length');

  const unitCategories = {
    length: [
      { unit: 'm', name: 'Meter' },
      { unit: 'km', name: 'Kilometer' },
      { unit: 'cm', name: 'Centimeter' },
      { unit: 'mm', name: 'Millimeter' },
      { unit: 'in', name: 'Inch' },
      { unit: 'ft', name: 'Foot' },
      { unit: 'yd', name: 'Yard' },
      { unit: 'mi', name: 'Mile' },
    ],
    weight: [
      { unit: 'kg', name: 'Kilogram' },
      { unit: 'g', name: 'Gram' },
      { unit: 'mg', name: 'Milligram' },
      { unit: 'lb', name: 'Pound' },
      { unit: 'oz', name: 'Ounce' },
    ],
    volume: [
      { unit: 'l', name: 'Liter' },
      { unit: 'ml', name: 'Milliliter' },
      { unit: 'gal', name: 'Gallon' },
      { unit: 'qt', name: 'Quart' },
      { unit: 'pt', name: 'Pint' },
      { unit: 'cup', name: 'Cup' },
      { unit: 'fl_oz', name: 'Fluid Ounce' },
    ],
    temperature: [
      { unit: 'c', name: 'Celsius' },
      { unit: 'f', name: 'Fahrenheit' },
      { unit: 'k', name: 'Kelvin' },
    ],
  };

  const conversionFactors = {
    length: {
      m: 1, km: 0.001, cm: 100, mm: 1000, in: 39.3701, ft: 3.28084, yd: 1.09361, mi: 0.000621371,
    },
    weight: {
      kg: 1, g: 1000, mg: 1e6, lb: 2.20462, oz: 35.274,
    },
    volume: {
      l: 1, ml: 1000, gal: 0.264172, qt: 1.05669, pt: 2.11338, cup: 4.22675, fl_oz: 33.814,
    },
  };

  useEffect(() => {
    convertUnit();
  }, [amount, fromUnit, toUnit, category]);

  const convertUnit = () => {
    if (category === 'temperature') {
      setResult(convertTemperature(parseFloat(amount), fromUnit, toUnit));
    } else {
      const fromFactor = conversionFactors[category][fromUnit];
      const toFactor = conversionFactors[category][toUnit];
      const converted = (parseFloat(amount) / fromFactor) * toFactor;
      setResult(converted.toFixed(6));
    }
  };

  const convertTemperature = (value, from, to) => {
    if (from === to) return value;
    if (from === 'c' && to === 'f') return (value * 9/5) + 32;
    if (from === 'c' && to === 'k') return value + 273.15;
    if (from === 'f' && to === 'c') return (value - 32) * 5/9;
    if (from === 'f' && to === 'k') return (value - 32) * 5/9 + 273.15;
    if (from === 'k' && to === 'c') return value - 273.15;
    if (from === 'k' && to === 'f') return (value - 273.15) * 9/5 + 32;
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-dark-background-2 rounded-lg text-gray-800 dark:text-gray-400">
      <h2 className="text-2xl font-bold mb-6">Unit Converter</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setFromUnit(unitCategories[e.target.value][0].unit);
            setToUnit(unitCategories[e.target.value][1].unit);
          }}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {Object.keys(unitCategories).map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Amount</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">From</label>
          <select
            value={fromUnit}
            onChange={(e) => setFromUnit(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {unitCategories[category].map((unit) => (
              <option key={unit.unit} value={unit.unit}>
                {unit.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">To</label>
          <select
            value={toUnit}
            onChange={(e) => setToUnit(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {unitCategories[category].map((unit) => (
              <option key={unit.unit} value={unit.unit}>
                {unit.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {result && (
        <div className="bg-gray-100 p-4 rounded">
          <p className="text-lg font-semibold">
            {amount} {unitCategories[category].find(u => u.unit === fromUnit).name} =
          </p>
          <p className="text-2xl font-bold text-customblue-500">
            {result} {unitCategories[category].find(u => u.unit === toUnit).name}
          </p>
        </div>
      )}
    </div>
  );
};

export default UnitConverter;