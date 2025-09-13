
import React from 'react';

const DbError: React.FC<{ error: any }> = ({ error }) => {
    const lang = localStorage.getItem('app_language') || (navigator.language.startsWith('zh') ? 'zh' : 'en');
    const isZh = lang === 'zh';
    
    return (
        <div style={{ color: '#fca5a5', backgroundColor: '#111827', padding: '2rem', textAlign: 'center', fontFamily: "'VT323', monospace", height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '4px solid #8b5cf6' }}>
            <h1 style={{ fontSize: '2.5rem', color: '#facc15', fontFamily: "'Press Start 2P', cursive" }}>
                {isZh ? '应用错误' : 'Application Error'}
            </h1>
            <p style={{ fontSize: '1.25rem', marginTop: '1rem' }}>
                {isZh ? '无法连接到本地数据库。' : 'Could not connect to the local database.'}
            </p>
            <p style={{ fontSize: '1.25rem' }}>
                {isZh ? '您的历史记录将无法保存。' : 'Your history will not be saved.'}
            </p>
            <p style={{ fontSize: '1rem', marginTop: '2rem', color: '#9ca3af', maxWidth: '600px' }}>
                {isZh ? '这可能是由于在隐私/无痕模式下浏览，或浏览器设置阻止了数据存储。请检查您的浏览器设置，然后刷新页面重试。' : 'This might be because you are browsing in private/incognito mode, or your browser settings are blocking data storage. Please check your browser settings and refresh the page to try again.'}
            </p>
            <p style={{ fontSize: '0.8rem', marginTop: '1rem', color: '#6b7280' }}>
                {isZh ? '错误详情: ' : 'Error details: '} {String(error)}
            </p>
        </div>
    );
};

export default DbError;
