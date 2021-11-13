/**
 * Extracts the user ID from an argument that is possibly an object containing that ID.
 *
 * @param user The user ID or object.
 */
export function extractUserId(user) {
    if (typeof user === 'string') {
        return user;
    }
    else if (typeof user === 'number') {
        return user.toString(10);
    }
    else {
        return user.id;
    }
}
/**
 * Extracts the user name from an argument that is possibly an object containing that name.
 *
 * @param user The user name or object.
 */
export function extractUserName(user) {
    return typeof user === 'string' ? user : user.name;
}
