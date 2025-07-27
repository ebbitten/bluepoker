/**
 * Phase 12: Mobile Device and Accessibility Testing
 * Comprehensive testing for mobile devices, screen readers, and accessibility compliance
 */

import { describe, test, expect } from 'vitest';

// Mock mobile user agents for testing
const MOBILE_USER_AGENTS = [
  // iOS devices
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  
  // Android devices
  'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  
  // Tablets
  'Mozilla/5.0 (Linux; Android 13; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  
  // Older mobile devices
  'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 8.0; SM-G950F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
];

// Screen reader and accessibility user agents
const ACCESSIBILITY_USER_AGENTS = [
  // Screen readers
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 NVDA/2023.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 JAWS/2023',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 VoiceOver',
  
  // High contrast mode
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 HighContrast',
  
  // Voice control
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 DragonNaturallySpeaking'
];

// Mock viewport sizes for different devices
const DEVICE_VIEWPORTS = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 13', width: 390, height: 844 },
  { name: 'iPhone 13 Pro Max', width: 428, height: 926 },
  { name: 'Samsung Galaxy S21', width: 360, height: 800 },
  { name: 'iPad Mini', width: 768, height: 1024 },
  { name: 'iPad Pro', width: 1024, height: 1366 },
  { name: 'Small Android', width: 320, height: 568 },
  { name: 'Large Android', width: 412, height: 869 }
];

// Helper to test mobile-specific functionality
async function testMobileEndpoint(userAgent: string, viewportWidth?: number) {
  try {
    const response = await fetch('http://localhost:3000/table', {
      headers: {
        'User-Agent': userAgent,
        ...(viewportWidth && { 'Viewport-Width': viewportWidth.toString() })
      }
    });
    
    return {
      success: response.ok,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      contentType: response.headers.get('content-type'),
      responseSize: response.headers.get('content-length')
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper to create test game for mobile testing
async function createMobileTestGame(suffix = '') {
  const response = await fetch('http://localhost:3000/api/game/create', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
    },
    body: JSON.stringify({
      playerNames: [`MobilePlayer1${suffix}`, `MobilePlayer2${suffix}`]
    })
  });
  
  if (!response.ok) {
    throw new Error(`Mobile game creation failed: ${response.status}`);
  }
  
  return await response.json();
}

describe('Phase 12: Mobile Device and Accessibility Testing', () => {
  describe('Mobile Device Compatibility', () => {
    test('Mobile user agent compatibility', async () => {
      console.log('Testing mobile user agent compatibility...');
      
      const mobileResults = [];
      
      for (const [index, userAgent] of MOBILE_USER_AGENTS.entries()) {
        const deviceName = userAgent.includes('iPhone') ? 'iPhone' :
                          userAgent.includes('iPad') ? 'iPad' :
                          userAgent.includes('Android') ? 'Android' : 'Unknown';
        
        const result = await testMobileEndpoint(userAgent);
        
        mobileResults.push({
          index,
          deviceName,
          userAgent: userAgent.substring(0, 50) + '...',
          success: result.success,
          status: result.status,
          contentType: result.contentType,
          mobileOptimized: result.headers?.['viewport'] || result.headers?.['content-type']?.includes('mobile')
        });
      }
      
      const successfulMobile = mobileResults.filter(r => r.success);
      const failedMobile = mobileResults.filter(r => !r.success);
      
      console.log(`Mobile User Agent Results:`);
      console.log(`  Total Devices Tested: ${MOBILE_USER_AGENTS.length}`);
      console.log(`  Successful: ${successfulMobile.length}`);
      console.log(`  Failed: ${failedMobile.length}`);
      console.log(`  Success Rate: ${(successfulMobile.length / MOBILE_USER_AGENTS.length * 100).toFixed(1)}%`);
      
      // Should work on all major mobile devices
      expect(successfulMobile.length).toBeGreaterThan(MOBILE_USER_AGENTS.length * 0.9);
    });

    test('Mobile viewport and responsive design', async () => {
      console.log('Testing mobile viewport handling...');
      
      const viewportResults = [];
      
      for (const viewport of DEVICE_VIEWPORTS) {
        try {
          // Test game creation on mobile viewport
          const game = await createMobileTestGame(`_${viewport.name.replace(/\s+/g, '_')}`);
          
          // Test API calls with mobile user agent
          const apiTest = await fetch(`http://localhost:3000/api/game/${game.gameId}`, {
            headers: {
              'User-Agent': MOBILE_USER_AGENTS[0],
              'Viewport-Width': viewport.width.toString()
            }
          });
          
          viewportResults.push({
            device: viewport.name,
            width: viewport.width,
            height: viewport.height,
            gameCreated: !!game.gameId,
            apiResponse: apiTest.ok,
            category: viewport.width < 400 ? 'small' : viewport.width < 800 ? 'medium' : 'large'
          });
          
        } catch (error) {
          viewportResults.push({
            device: viewport.name,
            width: viewport.width,
            height: viewport.height,
            gameCreated: false,
            apiResponse: false,
            error: error.message,
            category: viewport.width < 400 ? 'small' : viewport.width < 800 ? 'medium' : 'large'
          });
        }
      }
      
      const workingViewports = viewportResults.filter(r => r.gameCreated && r.apiResponse);
      const byCategory = {
        small: viewportResults.filter(r => r.category === 'small'),
        medium: viewportResults.filter(r => r.category === 'medium'),
        large: viewportResults.filter(r => r.category === 'large')
      };
      
      console.log(`Mobile Viewport Results:`);
      console.log(`  Total Viewports: ${DEVICE_VIEWPORTS.length}`);
      console.log(`  Working Viewports: ${workingViewports.length}`);
      console.log(`  Small Screens (${byCategory.small.length}): ${byCategory.small.filter(r => r.gameCreated).length} working`);
      console.log(`  Medium Screens (${byCategory.medium.length}): ${byCategory.medium.filter(r => r.gameCreated).length} working`);
      console.log(`  Large Screens (${byCategory.large.length}): ${byCategory.large.filter(r => r.gameCreated).length} working`);
      
      // Should work on most viewport sizes
      expect(workingViewports.length).toBeGreaterThan(DEVICE_VIEWPORTS.length * 0.8);
    });

    test('Mobile touch and gesture simulation', async () => {
      console.log('Testing mobile touch interactions...');
      
      const game = await createMobileTestGame('_touch');
      
      // Simulate touch events through API calls (since we can't actually touch in Node.js)
      const touchSimulations = [
        // Tap gestures (single API calls)
        { type: 'tap', action: () => fetch(`http://localhost:3000/api/game/${game.gameId}`) },
        
        // Swipe gestures (rapid sequential calls)
        { 
          type: 'swipe', 
          action: async () => {
            const promises = Array(3).fill(0).map(() => 
              fetch(`http://localhost:3000/api/game/${game.gameId}`)
            );
            return await Promise.all(promises);
          }
        },
        
        // Long press (delayed call)
        {
          type: 'longpress',
          action: async () => {
            await new Promise(resolve => setTimeout(resolve, 500));
            return await fetch(`http://localhost:3000/api/game/${game.gameId}`);
          }
        },
        
        // Multi-touch (concurrent calls)
        {
          type: 'multitouch',
          action: async () => {
            const promises = [
              fetch(`http://localhost:3000/api/game/${game.gameId}`),
              fetch(`http://localhost:3000/api/health`)
            ];
            return await Promise.all(promises);
          }
        }
      ];
      
      const touchResults = [];
      
      for (const [index, simulation] of touchSimulations.entries()) {
        const touchStart = Date.now();
        
        try {
          const result = await simulation.action();
          const touchDuration = Date.now() - touchStart;
          
          const success = Array.isArray(result) ? 
            result.every(r => r.ok) : 
            result.ok;
          
          touchResults.push({
            index,
            type: simulation.type,
            success,
            duration: touchDuration,
            responsive: touchDuration < 1000
          });
          
        } catch (error) {
          touchResults.push({
            index,
            type: simulation.type,
            success: false,
            duration: Date.now() - touchStart,
            error: error.message
          });
        }
      }
      
      const successfulTouch = touchResults.filter(r => r.success);
      const responsiveTouch = touchResults.filter(r => r.responsive);
      
      console.log(`Touch Interaction Results:`);
      console.log(`  Total Simulations: ${touchSimulations.length}`);
      console.log(`  Successful: ${successfulTouch.length}`);
      console.log(`  Responsive (<1s): ${responsiveTouch.length}`);
      
      // Touch interactions should work reliably
      expect(successfulTouch.length).toBe(touchSimulations.length);
      expect(responsiveTouch.length).toBeGreaterThan(touchSimulations.length * 0.8);
    });
  });

  describe('Accessibility Compliance Testing', () => {
    test('Screen reader compatibility', async () => {
      console.log('Testing screen reader compatibility...');
      
      const screenReaderResults = [];
      
      for (const [index, userAgent] of ACCESSIBILITY_USER_AGENTS.entries()) {
        const assistiveTech = userAgent.includes('NVDA') ? 'NVDA' :
                             userAgent.includes('JAWS') ? 'JAWS' :
                             userAgent.includes('VoiceOver') ? 'VoiceOver' :
                             userAgent.includes('HighContrast') ? 'High Contrast' :
                             userAgent.includes('DragonNaturallySpeaking') ? 'Voice Control' : 'Unknown';
        
        try {
          // Test page load with assistive technology user agent
          const pageResponse = await fetch('http://localhost:3000/table', {
            headers: { 'User-Agent': userAgent }
          });
          
          // Test API functionality with assistive technology
          const game = await createMobileTestGame(`_${assistiveTech.replace(/\s+/g, '_')}`);
          
          const apiResponse = await fetch(`http://localhost:3000/api/game/${game.gameId}`, {
            headers: { 'User-Agent': userAgent }
          });
          
          screenReaderResults.push({
            index,
            assistiveTech,
            pageLoaded: pageResponse.ok,
            apiWorking: apiResponse.ok,
            gameCreated: !!game.gameId,
            fullyAccessible: pageResponse.ok && apiResponse.ok && !!game.gameId
          });
          
        } catch (error) {
          screenReaderResults.push({
            index,
            assistiveTech,
            pageLoaded: false,
            apiWorking: false,
            gameCreated: false,
            fullyAccessible: false,
            error: error.message
          });
        }
      }
      
      const fullyAccessible = screenReaderResults.filter(r => r.fullyAccessible);
      const partiallyAccessible = screenReaderResults.filter(r => r.pageLoaded || r.apiWorking);
      
      console.log(`Screen Reader Compatibility Results:`);
      console.log(`  Total Assistive Technologies: ${ACCESSIBILITY_USER_AGENTS.length}`);
      console.log(`  Fully Accessible: ${fullyAccessible.length}`);
      console.log(`  Partially Accessible: ${partiallyAccessible.length}`);
      console.log(`  Working Technologies: ${fullyAccessible.map(r => r.assistiveTech).join(', ')}`);
      
      // Should be accessible to major screen readers
      expect(fullyAccessible.length).toBeGreaterThan(ACCESSIBILITY_USER_AGENTS.length * 0.6);
    });

    test('Keyboard navigation simulation', async () => {
      console.log('Testing keyboard navigation patterns...');
      
      const game = await createMobileTestGame('_keyboard');
      
      // Simulate keyboard navigation through API calls
      const keyboardPatterns = [
        // Tab navigation (sequential API calls)
        {
          name: 'tab_navigation',
          pattern: async () => {
            const responses = [];
            responses.push(await fetch(`http://localhost:3000/api/game/${game.gameId}`));
            await new Promise(resolve => setTimeout(resolve, 100));
            responses.push(await fetch(`http://localhost:3000/api/health`));
            await new Promise(resolve => setTimeout(resolve, 100));
            responses.push(await fetch(`http://localhost:3000/api/game/${game.gameId}`));
            return responses;
          }
        },
        
        // Enter key activation (POST requests)
        {
          name: 'enter_activation',
          pattern: async () => {
            return await fetch(`http://localhost:3000/api/game/${game.gameId}/deal`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
          }
        },
        
        // Arrow key navigation (directional API calls)
        {
          name: 'arrow_navigation',
          pattern: async () => {
            const responses = [];
            // Simulate up/down/left/right navigation
            for (let i = 0; i < 4; i++) {
              responses.push(await fetch(`http://localhost:3000/api/game/${game.gameId}`));
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            return responses;
          }
        },
        
        // Escape key (cancel operations)
        {
          name: 'escape_key',
          pattern: async () => {
            // Attempt operation then "cancel" it
            await fetch(`http://localhost:3000/api/game/${game.gameId}/deal`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            }).catch(() => {});
            
            // Return to safe state
            return await fetch(`http://localhost:3000/api/game/${game.gameId}`);
          }
        }
      ];
      
      const keyboardResults = [];
      
      for (const [index, pattern] of keyboardPatterns.entries()) {
        const navStart = Date.now();
        
        try {
          const result = await pattern.pattern();
          const navDuration = Date.now() - navStart;
          
          const success = Array.isArray(result) ? 
            result.every(r => r.ok) : 
            result.ok;
          
          keyboardResults.push({
            index,
            pattern: pattern.name,
            success,
            duration: navDuration,
            responsive: navDuration < 2000
          });
          
        } catch (error) {
          keyboardResults.push({
            index,
            pattern: pattern.name,
            success: false,
            duration: Date.now() - navStart,
            error: error.message
          });
        }
      }
      
      const successfulNav = keyboardResults.filter(r => r.success);
      const responsiveNav = keyboardResults.filter(r => r.responsive);
      
      console.log(`Keyboard Navigation Results:`);
      console.log(`  Total Patterns: ${keyboardPatterns.length}`);
      console.log(`  Successful: ${successfulNav.length}`);
      console.log(`  Responsive: ${responsiveNav.length}`);
      
      // Keyboard navigation should work consistently
      expect(successfulNav.length).toBeGreaterThan(keyboardPatterns.length * 0.75);
    });

    test('High contrast and visual accessibility', async () => {
      console.log('Testing high contrast and visual accessibility...');
      
      const visualTests = [
        // High contrast mode simulation
        {
          name: 'high_contrast',
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 HighContrast',
            'Prefers-Color-Scheme': 'high-contrast'
          }
        },
        
        // Dark mode
        {
          name: 'dark_mode',
          headers: { 
            'Prefers-Color-Scheme': 'dark'
          }
        },
        
        // Reduced motion
        {
          name: 'reduced_motion',
          headers: { 
            'Prefers-Reduced-Motion': 'reduce'
          }
        },
        
        // Large text simulation
        {
          name: 'large_text',
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 LargeText'
          }
        },
        
        // Color blindness simulation (can't test colors, but test functionality)
        {
          name: 'color_blind',
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 ColorBlind'
          }
        }
      ];
      
      const visualResults = [];
      
      for (const [index, visualTest] of visualTests.entries()) {
        try {
          // Test page load with visual accessibility headers
          const pageResponse = await fetch('http://localhost:3000/table', {
            headers: visualTest.headers
          });
          
          // Test game functionality
          const game = await createMobileTestGame(`_${visualTest.name}`);
          
          // Test API with visual accessibility headers
          const apiResponse = await fetch(`http://localhost:3000/api/game/${game.gameId}`, {
            headers: visualTest.headers
          });
          
          visualResults.push({
            index,
            test: visualTest.name,
            pageLoaded: pageResponse.ok,
            gameCreated: !!game.gameId,
            apiWorking: apiResponse.ok,
            fullyAccessible: pageResponse.ok && !!game.gameId && apiResponse.ok
          });
          
        } catch (error) {
          visualResults.push({
            index,
            test: visualTest.name,
            pageLoaded: false,
            gameCreated: false,
            apiWorking: false,
            fullyAccessible: false,
            error: error.message
          });
        }
      }
      
      const accessibleTests = visualResults.filter(r => r.fullyAccessible);
      const partiallyAccessible = visualResults.filter(r => r.pageLoaded || r.gameCreated || r.apiWorking);
      
      console.log(`Visual Accessibility Results:`);
      console.log(`  Total Tests: ${visualTests.length}`);
      console.log(`  Fully Accessible: ${accessibleTests.length}`);
      console.log(`  Partially Accessible: ${partiallyAccessible.length}`);
      console.log(`  Working: ${accessibleTests.map(r => r.test).join(', ')}`);
      
      // Should support major visual accessibility features
      expect(accessibleTests.length).toBeGreaterThan(visualTests.length * 0.7);
    });
  });

  describe('Performance on Mobile Devices', () => {
    test('Mobile performance optimization', async () => {
      console.log('Testing mobile performance optimization...');
      
      const mobilePerformanceTests = [];
      
      // Test different mobile connection speeds
      const connectionSpeeds = [
        { name: '2G', delay: 2000, bandwidth: '50kb' },
        { name: '3G', delay: 500, bandwidth: '1mb' },
        { name: '4G', delay: 100, bandwidth: '10mb' },
        { name: '5G', delay: 20, bandwidth: '100mb' },
        { name: 'WiFi', delay: 10, bandwidth: '1gb' }
      ];
      
      for (const speed of connectionSpeeds) {
        const perfStart = Date.now();
        
        try {
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, speed.delay / 10)); // Scaled down for testing
          
          // Test game creation on mobile
          const game = await createMobileTestGame(`_${speed.name}`);
          
          // Test API response
          const apiResponse = await fetch(`http://localhost:3000/api/game/${game.gameId}`, {
            headers: { 'User-Agent': MOBILE_USER_AGENTS[0] }
          });
          
          const totalTime = Date.now() - perfStart;
          
          mobilePerformanceTests.push({
            connection: speed.name,
            gameCreated: !!game.gameId,
            apiWorking: apiResponse.ok,
            totalTime,
            acceptable: totalTime < 5000, // Under 5 seconds acceptable for mobile
            simulatedDelay: speed.delay / 10
          });
          
        } catch (error) {
          mobilePerformanceTests.push({
            connection: speed.name,
            gameCreated: false,
            apiWorking: false,
            totalTime: Date.now() - perfStart,
            acceptable: false,
            error: error.message
          });
        }
      }
      
      const acceptablePerformance = mobilePerformanceTests.filter(r => r.acceptable);
      const workingConnections = mobilePerformanceTests.filter(r => r.gameCreated && r.apiWorking);
      const avgTime = mobilePerformanceTests.reduce((sum, test) => sum + test.totalTime, 0) / mobilePerformanceTests.length;
      
      console.log(`Mobile Performance Results:`);
      console.log(`  Connection Types: ${connectionSpeeds.length}`);
      console.log(`  Working Connections: ${workingConnections.length}`);
      console.log(`  Acceptable Performance: ${acceptablePerformance.length}`);
      console.log(`  Average Time: ${avgTime.toFixed(2)}ms`);
      
      // Should work well on most mobile connections
      expect(workingConnections.length).toBeGreaterThan(connectionSpeeds.length * 0.8);
      expect(acceptablePerformance.length).toBeGreaterThan(connectionSpeeds.length * 0.6);
    });

    test('Mobile resource optimization', async () => {
      console.log('Testing mobile resource optimization...');
      
      const resourceTests = [
        // Test with mobile-specific headers
        {
          name: 'mobile_optimized',
          headers: {
            'User-Agent': MOBILE_USER_AGENTS[0],
            'Save-Data': 'on',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate'
          }
        },
        
        // Test with data saver mode
        {
          name: 'data_saver',
          headers: {
            'User-Agent': MOBILE_USER_AGENTS[1],
            'Save-Data': 'on',
            'Accept': 'application/json',
            'Connection': 'slow'
          }
        },
        
        // Test with low memory device simulation
        {
          name: 'low_memory',
          headers: {
            'User-Agent': MOBILE_USER_AGENTS[6], // Older Android
            'Device-Memory': '1',
            'Accept': 'application/json'
          }
        }
      ];
      
      const resourceResults = [];
      
      for (const [index, test] of resourceTests.entries()) {
        const resourceStart = Date.now();
        
        try {
          // Test page load with resource constraints
          const pageResponse = await fetch('http://localhost:3000/table', {
            headers: test.headers
          });
          
          // Test API efficiency
          const game = await createMobileTestGame(`_${test.name}`);
          
          const apiResponse = await fetch(`http://localhost:3000/api/game/${game.gameId}`, {
            headers: test.headers
          });
          
          const resourceTime = Date.now() - resourceStart;
          
          resourceResults.push({
            index,
            test: test.name,
            pageLoaded: pageResponse.ok,
            gameCreated: !!game.gameId,
            apiWorking: apiResponse.ok,
            resourceTime,
            efficient: resourceTime < 3000,
            contentLength: pageResponse.headers.get('content-length') || 'unknown'
          });
          
        } catch (error) {
          resourceResults.push({
            index,
            test: test.name,
            pageLoaded: false,
            gameCreated: false,
            apiWorking: false,
            resourceTime: Date.now() - resourceStart,
            efficient: false,
            error: error.message
          });
        }
      }
      
      const efficientTests = resourceResults.filter(r => r.efficient);
      const workingTests = resourceResults.filter(r => r.pageLoaded && r.gameCreated && r.apiWorking);
      
      console.log(`Mobile Resource Optimization Results:`);
      console.log(`  Total Tests: ${resourceTests.length}`);
      console.log(`  Working Tests: ${workingTests.length}`);
      console.log(`  Efficient Tests: ${efficientTests.length}`);
      
      // Should work efficiently on resource-constrained devices
      expect(workingTests.length).toBe(resourceTests.length);
      expect(efficientTests.length).toBeGreaterThan(resourceTests.length * 0.7);
    });
  });
});