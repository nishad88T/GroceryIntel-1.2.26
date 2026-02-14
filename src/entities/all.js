import { appClient } from '@/api/appClient';

const createEntityClass = (entityName) => {
  const api = appClient.entities[entityName];
  return class {
    static async list(sortOrFilters, maybeLimit) {
      if (typeof sortOrFilters === 'string') {
        return api.filter({}, sortOrFilters, maybeLimit);
      }
      return api.list(sortOrFilters || {}, maybeLimit);
    }

    static async filter(filters = {}, sort, limit) {
      return api.filter(filters, sort, limit);
    }

    static async get(id) {
      return api.get(id);
    }

    static async create(payload) {
      return api.create(payload);
    }

    static async update(id, payload) {
      return api.update(id, payload);
    }

    static async delete(id) {
      return api.delete(id);
    }
  };
};

export class User extends createEntityClass('User') {
  static async me() {
    return appClient.auth.me();
  }

  static async updateMyUserData(updates) {
    return appClient.auth.updateMe(updates);
  }
}

export class Receipt extends createEntityClass('Receipt') {}
export class ReceiptItem extends createEntityClass('ReceiptItem') {}
export class Budget extends createEntityClass('Budget') {}
export class Category extends createEntityClass('Category') {}
export class MealPlan extends createEntityClass('MealPlan') {}
export class MealPlanItem extends createEntityClass('MealPlanItem') {}
export class ShoppingList extends createEntityClass('ShoppingList') {}
export class ShoppingListItem extends createEntityClass('ShoppingListItem') {}
export class Recipe extends createEntityClass('Recipe') {}
export class RecipeFolder extends createEntityClass('RecipeFolder') {}
export class RecipeFolderItem extends createEntityClass('RecipeFolderItem') {}

export class Household extends createEntityClass('Household') {
  static async getMyHousehold() {
    const response = await appClient.functions.invoke('getMyHousehold', {});
    return response.data;
  }
}

export class HouseholdMember extends createEntityClass('HouseholdMember') {}
export class HouseholdInvitation extends createEntityClass('HouseholdInvitation') {}
export class CorrectionLog extends createEntityClass('CorrectionLog') {}
export class OCRFeedback extends createEntityClass('OCRFeedback') {}
