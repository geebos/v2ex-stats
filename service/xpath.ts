// XPath 操作工具类，提供各种 XPath 查询方法

// 查找字符串值
const findString = (path: string, root: Node = document): string | null => {
  const result = document.evaluate(path, root, null, XPathResult.STRING_TYPE, null);
  return result.stringValue;
}

// 查找数值
const findNumber = (path: string, root: Node = document): number | null => {
  const result = document.evaluate(path, root, null, XPathResult.NUMBER_TYPE, null);
  return result.numberValue;
}

// 查找布尔值
const findBoolean = (path: string, root: Node = document): boolean | null => {
  const result = document.evaluate(path, root, null, XPathResult.BOOLEAN_TYPE, null);
  return result.booleanValue;
}

// 查找单个节点
const findNode = <T extends Node>(path: string, root: Node = document): T | null => {
  const result = document.evaluate(path, root, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  return result.singleNodeValue as T | null;
}

// 查找多个节点
const findNodes = <T extends Node>(path: string, root: Node = document): T[] => {
  const result = document.evaluate(path, root, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
  const nodes: Node[] = [];
  let node = result.iterateNext();
  while (node) {
    nodes.push(node);
    node = result.iterateNext();
  }
  return nodes as T[];
}

export default {
  findString,
  findNumber,
  findBoolean,
  findNode,
  findNodes,
}