// Separate entry point: pulls in @atproto/oauth-client-browser (optional peer dependency).
export {
  initializeAT,
  onATInvalidated,
  checkedPassage,
  createPublicRecord,
  publishAT,
  type ATConnection,
} from './community/atproto';
