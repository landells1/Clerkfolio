// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { requestIp } from '@/lib/request-ip'

function reqWith(headers: Record<string, string>) {
  return { headers: new Headers(headers) }
}

describe('requestIp', () => {
  it('uses the first entry of x-forwarded-for', () => {
    expect(requestIp(reqWith({ 'x-forwarded-for': '203.0.113.5, 70.41.3.18, 150.172.238.178' }))).toBe('203.0.113.5')
  })

  it('trims whitespace around the client IP', () => {
    expect(requestIp(reqWith({ 'x-forwarded-for': '  203.0.113.5  , 10.0.0.1' }))).toBe('203.0.113.5')
  })

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    expect(requestIp(reqWith({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7')
  })

  it('prefers x-forwarded-for over x-real-ip', () => {
    expect(requestIp(reqWith({ 'x-forwarded-for': '203.0.113.5', 'x-real-ip': '198.51.100.7' }))).toBe('203.0.113.5')
  })

  it('returns "unknown" when neither header is present', () => {
    expect(requestIp(reqWith({}))).toBe('unknown')
  })

  it('returns "unknown" when x-forwarded-for is empty', () => {
    // An empty header yields an empty first segment; we must not return ''.
    expect(requestIp(reqWith({ 'x-forwarded-for': '' }))).toBe('unknown')
  })
})
