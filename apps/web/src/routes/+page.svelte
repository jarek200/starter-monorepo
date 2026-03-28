<svelte:head>
  <title>SST Monorepo Starter - Modern Full-Stack Template</title>
  <meta name="description" content="A modern, production-ready starter template for building full-stack applications with SvelteKit, AWS AppSync, Cognito, and DynamoDB. Build your next application faster." />
</svelte:head>

<script lang="ts">
import { goto } from '$app/navigation';
import { Button } from '$lib/components/ui/button/index.js';
import { Card, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
  <div class="absolute inset-0 overflow-hidden">
    <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
    <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
  </div>
  
  <div class="container mx-auto px-4 py-20 relative z-10">
    <div class="max-w-4xl mx-auto text-center">
      <h1 class="text-6xl md:text-7xl font-bold mb-6 leading-tight">
        <span class="bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
          SST Monorepo Starter
        </span>
      </h1>
      
      <p class="text-xl text-gray-300 max-w-2xl mx-auto mb-12 leading-relaxed">
        A modern starter template with SvelteKit, AWS AppSync, Cognito, and DynamoDB.
        Build your next application faster.
      </p>

      <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Button
          onclick={() => goto('/login')}
          size="lg"
          class="px-8 py-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-semibold rounded-2xl shadow-2xl hover:shadow-purple-500/50 transform hover:scale-105 transition-all duration-300"
        >
          Get Started
        </Button>
      </div>

      <div class="grid md:grid-cols-3 gap-6 mt-20">
        <Card class="bg-white/5 backdrop-blur-lg rounded-3xl border-0">
          <CardHeader>
            <CardTitle class="text-white">Authentication</CardTitle>
            <CardDescription class="text-gray-300">AWS Cognito integration with email verification</CardDescription>
          </CardHeader>
        </Card>

        <Card class="bg-white/5 backdrop-blur-lg rounded-3xl border-0">
          <CardHeader>
            <CardTitle class="text-white">GraphQL API</CardTitle>
            <CardDescription class="text-gray-300">AppSync with JavaScript resolvers</CardDescription>
          </CardHeader>
        </Card>

        <Card class="bg-white/5 backdrop-blur-lg rounded-3xl border-0">
          <CardHeader>
            <CardTitle class="text-white">Database</CardTitle>
            <CardDescription class="text-gray-300">DynamoDB with single-table design</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes blob {
    0%, 100% {
      transform: translate(0, 0) scale(1);
    }
    33% {
      transform: translate(30px, -50px) scale(1.1);
    }
    66% {
      transform: translate(-20px, 20px) scale(0.9);
    }
  }
  
  .animate-blob {
    animation: blob 7s infinite;
  }
  
  .animation-delay-2000 {
    animation-delay: 2s;
  }
</style>
