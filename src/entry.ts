import { PortfolioWorkflow } from './workflow';

export { PortfolioWorkflow };

const astroHandler = await import('@astrojs/cloudflare/entrypoints/server');
export default astroHandler.default;
