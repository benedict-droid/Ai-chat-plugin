<?php declare(strict_types=1);

namespace AgenticAiSupport\Storefront\Controller;

use Shopware\Core\Framework\Routing\Annotation\RouteScope;
use Shopware\Storefront\Controller\StorefrontController;
use Shopware\Core\System\SalesChannel\SalesChannelContext;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

#[Route(defaults: ['_routeScope' => ['storefront']])]
class ContextController extends StorefrontController
{
    #[Route(path: '/agentic-ai/context', name: 'frontend.agentic-ai.context', methods: ['GET'], defaults: ['csrf_protected' => false])]
    public function getContextToken(SalesChannelContext $context): JsonResponse
    {
        return new JsonResponse([
            'token' => $context->getToken()
        ]);
    }
}
