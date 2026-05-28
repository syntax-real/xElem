const LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
};

const COLORS = {
    DEBUG: 'color: #888',
    INFO: 'color: #2ecc71',
    WARN: 'color: #f39c12',
    ERROR: 'color: #e74c3c',
};

let CURRENT_LEVEL = LEVELS.DEBUG;
let ENABLED_MODULES = null;

export function configureLogger({
    level = 'DEBUG',
    modules = null,
} = {}) {
    CURRENT_LEVEL = LEVELS[level] ?? LEVELS.DEBUG;
    ENABLED_MODULES = modules;
}

function shouldLog(level, module) {
    if (LEVELS[level] < CURRENT_LEVEL) return false;
    if (ENABLED_MODULES && !ENABLED_MODULES.includes(module)) return false;
    return true;
}

function formatModule(module) {
    return module ? `[${module}]` : '';
}

function log(level, module, ...args) {
    if (!shouldLog(level, module)) return;

    const prefix = `%c${formatModule(module)}[${level}]`;

    const style = COLORS[level] || '';

    if (level === 'ERROR') {
        console.error(prefix, style, ...args);
    } else if (level === 'WARN') {
        console.warn(prefix, style, ...args);
    } else {
        console.log(prefix, style, ...args);
    }
}

export function createLogger(module) {
    return {
        debug: (...args) => log('DEBUG', module, ...args),
        info: (...args) => log('INFO', module, ...args),
        warn: (...args) => log('WARN', module, ...args),
        error: (...args) => log('ERROR', module, ...args),
    };
}