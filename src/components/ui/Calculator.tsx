import React, { useState } from 'react';
import { Calculator as CalcIcon, X } from 'lucide-react';

interface CalculatorProps {
    isOpen?: boolean;
    onClose?: () => void;
    showFloatingButton?: boolean;
}

export const Calculator: React.FC<CalculatorProps> = ({
    isOpen: controlledIsOpen,
    onClose,
    showFloatingButton
}) => {
    const [localIsOpen, setLocalIsOpen] = useState(false);
    const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : localIsOpen;
    const setIsOpen = (val: boolean) => {
        if (controlledIsOpen !== undefined) {
            if (!val && onClose) onClose();
        } else {
            setLocalIsOpen(val);
        }
    };
    const [display, setDisplay] = useState('0');
    const [equation, setEquation] = useState('');

    const handleNumber = (num: string) => {
        if (display === '0' || display === 'Error') {
            setDisplay(num);
        } else {
            setDisplay(display + num);
        }
    };

    const handleOperator = (op: string) => {
        setEquation(display + ' ' + op + ' ');
        setDisplay('0');
    };

    const handleEqual = () => {
        try {
            // Safe evaluation using Function instead of eval
            const fullEq = equation + display;
            // Replace visual operators with JS operators
            const safeEq = fullEq.replace('×', '*').replace('÷', '/').replace('^', '**');
            const result = new Function('return ' + safeEq)();
            
            // Format result to avoid long decimals
            const formatted = Number.isInteger(result) ? result.toString() : parseFloat(result.toFixed(6)).toString();
            setDisplay(formatted);
            setEquation('');
        } catch {
            setDisplay('Error');
            setEquation('');
        }
    };

    const handleClear = () => {
        setDisplay('0');
        setEquation('');
    };

    const handleSciFunc = (func: string) => {
        try {
            const val = parseFloat(display);
            let res = 0;
            switch(func) {
                case 'sin': res = Math.sin(val); break;
                case 'cos': res = Math.cos(val); break;
                case 'tan': res = Math.tan(val); break;
                case 'log': res = Math.log10(val); break;
                case 'ln': res = Math.log(val); break;
                case 'sqrt': res = Math.sqrt(val); break;
                case 'sq': res = Math.pow(val, 2); break;
                case 'pi': res = Math.PI; break;
            }
            setDisplay(Number.isInteger(res) ? res.toString() : parseFloat(res.toFixed(6)).toString());
        } catch {
            setDisplay('Error');
        }
    };

    const isControlled = controlledIsOpen !== undefined;
    const finalShowFloatingButton = showFloatingButton ?? !isControlled;

    return (
        <div className={`fixed right-6 z-50 flex flex-col items-end ${finalShowFloatingButton ? 'bottom-6 right-[5.5rem]' : 'bottom-24'}`}>
            {isOpen && (
                <div className={`${finalShowFloatingButton ? 'mb-4' : ''} w-[320px] bg-gray-900 rounded-3xl shadow-2xl border border-gray-800 overflow-hidden flex flex-col transition-all duration-300 transform origin-bottom-right animate-in slide-in-from-bottom-2 fade-in`}>
                    {/* Header */}
                    <div className="bg-gray-900 p-4 flex items-center justify-between text-white border-b border-gray-800">
                        <div className="flex items-center space-x-2">
                            <CalcIcon className="w-5 h-5 text-brand-red" />
                            <span className="font-bold text-[14px] tracking-wide text-gray-200">Scientific Calc</span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Display */}
                    <div className="p-5 bg-gray-900 text-right">
                        <div className="text-gray-400 text-sm h-5 font-mono tracking-wider overflow-hidden">{equation}</div>
                        <div className="text-white text-4xl font-mono tracking-tight mt-1 truncate">{display}</div>
                    </div>

                    {/* Keypad */}
                    <div className="p-4 bg-gray-800 grid grid-cols-4 gap-2">
                        {/* Sci Row 1 */}
                        <button onClick={() => handleSciFunc('sin')} className="p-2 bg-gray-700 text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-600">sin</button>
                        <button onClick={() => handleSciFunc('cos')} className="p-2 bg-gray-700 text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-600">cos</button>
                        <button onClick={() => handleSciFunc('tan')} className="p-2 bg-gray-700 text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-600">tan</button>
                        <button onClick={handleClear} className="p-2 bg-brand-red/20 text-brand-red rounded-xl text-sm font-bold hover:bg-brand-red/30">C</button>
                        
                        {/* Sci Row 2 */}
                        <button onClick={() => handleSciFunc('log')} className="p-2 bg-gray-700 text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-600">log</button>
                        <button onClick={() => handleSciFunc('ln')} className="p-2 bg-gray-700 text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-600">ln</button>
                        <button onClick={() => handleSciFunc('sqrt')} className="p-2 bg-gray-700 text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-600">√</button>
                        <button onClick={() => handleOperator('÷')} className="p-2 bg-orange-500/20 text-orange-500 rounded-xl text-lg font-bold hover:bg-orange-500/30">÷</button>
                        
                        {/* Numpad Row 1 */}
                        <button onClick={() => handleNumber('7')} className="p-2 bg-gray-900 text-white rounded-xl text-lg font-bold hover:bg-black">7</button>
                        <button onClick={() => handleNumber('8')} className="p-2 bg-gray-900 text-white rounded-xl text-lg font-bold hover:bg-black">8</button>
                        <button onClick={() => handleNumber('9')} className="p-2 bg-gray-900 text-white rounded-xl text-lg font-bold hover:bg-black">9</button>
                        <button onClick={() => handleOperator('×')} className="p-2 bg-orange-500/20 text-orange-500 rounded-xl text-lg font-bold hover:bg-orange-500/30">×</button>

                        {/* Numpad Row 2 */}
                        <button onClick={() => handleNumber('4')} className="p-2 bg-gray-900 text-white rounded-xl text-lg font-bold hover:bg-black">4</button>
                        <button onClick={() => handleNumber('5')} className="p-2 bg-gray-900 text-white rounded-xl text-lg font-bold hover:bg-black">5</button>
                        <button onClick={() => handleNumber('6')} className="p-2 bg-gray-900 text-white rounded-xl text-lg font-bold hover:bg-black">6</button>
                        <button onClick={() => handleOperator('-')} className="p-2 bg-orange-500/20 text-orange-500 rounded-xl text-lg font-bold hover:bg-orange-500/30">-</button>

                        {/* Numpad Row 3 */}
                        <button onClick={() => handleNumber('1')} className="p-2 bg-gray-900 text-white rounded-xl text-lg font-bold hover:bg-black">1</button>
                        <button onClick={() => handleNumber('2')} className="p-2 bg-gray-900 text-white rounded-xl text-lg font-bold hover:bg-black">2</button>
                        <button onClick={() => handleNumber('3')} className="p-2 bg-gray-900 text-white rounded-xl text-lg font-bold hover:bg-black">3</button>
                        <button onClick={() => handleOperator('+')} className="p-2 bg-orange-500/20 text-orange-500 rounded-xl text-lg font-bold hover:bg-orange-500/30">+</button>

                        {/* Numpad Row 4 */}
                        <button onClick={() => handleSciFunc('pi')} className="p-2 bg-gray-700 text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-600">π</button>
                        <button onClick={() => handleNumber('0')} className="p-2 bg-gray-900 text-white rounded-xl text-lg font-bold hover:bg-black">0</button>
                        <button onClick={() => handleNumber('.')} className="p-2 bg-gray-900 text-white rounded-xl text-lg font-bold hover:bg-black">.</button>
                        <button onClick={handleEqual} className="p-2 bg-brand-red text-white rounded-xl text-lg font-bold hover:bg-brand-red-hover shadow-lg shadow-brand-red/20">=</button>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            {finalShowFloatingButton && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center justify-center w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg hover:bg-black hover:scale-105 transition-all duration-300 z-50 ${isOpen ? 'scale-0 opacity-0 absolute' : 'scale-100 opacity-100'}`}
                    style={{
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                    }}
                >
                    <CalcIcon className="w-5 h-5 text-gray-100" />
                </button>
            )}
        </div>
    );
};
